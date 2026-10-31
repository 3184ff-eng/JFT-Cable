' Copyright (c) 2026 Roku, Inc.
' SPDX-License-Identifier: MIT
'
' Stand-in for the firmware Tween node when firmware does not report the "tween" feature.
'
' Drives an Animation + FloatFieldInterpolator | Vector2dFieldInterpolator pair against the
' Tween field contract. The pair is built here and inserted next to this node, in its parent,
' so `fieldToInterp` resolves the target's id in the scope the target lives in; it is removed
' again when targetNode is cleared, or when a span ends after this node was detached from its
' parent (see onAnimStateChanged and releaseDetached). Value type (float vs vector2d) is detected from the target
' field and the trigger written; a scalar written to a vector field is auto-expanded to [v, v].
'
' Axis modes are "x", "y" and "all", resolved by resolvedAxis() before anything reasons about
' them, so there is one vector code path.
'
' Settle (onProposedStopsChanged): candidates are accepted strictly ahead in the direction of
' travel (> / <), a stationary span takes the absolute-nearest (sticky step), and the settle
' duration scales to hold velocity (floored at 0.02s, 0.05s zero-span fallback). On a vector
' field a candidate is a whole [x, y] point: it must be strictly ahead on every owned component
' that moves, the nearest such point by Euclidean distance wins, and it is applied to every
' owned component at once. There is no dominant axis.
'
' A candidate has the same arity as the value it settles. On a float field, or a vector field
' under axis "x" / "y", that is a scalar: the coordinate on the owned component; an array
' there is skipped. Under axis "all" it is an [x, y] pair; a scalar there is skipped, never
' lifted to [s, s]. See normalizeVectorStops().

sub init()
    m.anim         = invalid
    m.interp       = invalid
    m.armed        = invalid   ' { node, to }: the last destination armed or pinned, and on which node
    m.retryTimer   = invalid
    m.releasePending = false   ' a detached node's Animation is to be released on the next frame
    m.pendingFire  = false
    m.lastTarget = invalid
    m.targetWritten = false
    m.useScalarTarget = true
    m.valueType    = invalid   ' "float" | "vector2d", detected lazily
end sub

' Vector fields animate as vector2d; everything else as float. A targetVector write also
' forces vector2d (handled at its trigger).
function detectValueType() as string
    field = m.top.field
    if field = "translation" or field = "scale" or field = "scaleRotateCenter" then
        return "vector2d"
    end if
    return "float"
end function

' Lazily build m.anim / m.interp in this node's parent. Returns false while there is no target
' or no parent to put them in.
function ensureAnimReady() as boolean
    if m.top.targetNode = invalid then return false
    parent = m.top.getParent()
    if parent = invalid then return false
    if m.valueType = invalid then m.valueType = detectValueType()

    if m.anim <> invalid then
        animParent = m.anim.getParent()
        if animParent = invalid or not animParent.isSameNode(parent) then
            if animParent <> invalid then animParent.removeChild(m.anim)
            parent.appendChild(m.anim)
        end if
    else
        m.anim = createObject("roSGNode", "Animation")
        m.anim.repeat = false
        m.anim.observeFieldScopedEx("state", "onAnimStateChanged")
        parent.appendChild(m.anim)
    end if

    wantType = "FloatFieldInterpolator"
    if m.valueType = "vector2d" then wantType = "Vector2DFieldInterpolator"
    if m.interp <> invalid and LCase(m.interp.subtype()) <> LCase(wantType) then
        m.anim.removeChild(m.interp)
        m.interp = invalid
    end if
    if m.interp = invalid then
        m.interp = createObject("roSGNode", wantType)
        m.interp.key = [0.0, 1.0]
        m.anim.appendChild(m.interp)
    end if
    return true
end function

' Take the animation out of the parent, so a disposed tween leaves nothing behind in a tree
' it no longer belongs to and holds no node.
sub releaseAnim()
    m.pendingFire = false
    m.releasePending = false
    m.armed = invalid
    if m.retryTimer <> invalid then m.retryTimer.control = "stop"
    if m.anim = invalid then return
    m.anim.unobserveFieldScoped("state")
    m.anim.control = "stop"
    animParent = m.anim.getParent()
    if animParent <> invalid then animParent.removeChild(m.anim)
    m.anim = invalid
    m.interp = invalid
end sub

' The Animation lives beside this node, not under it, so removing this node from the tree does
' not remove it. The usual release is immediate: the Tween wrapper clears targetNode when it is
' disposed, and onTargetNodeChanged calls releaseAnim. For a raw <tween> removed mid-flight
' without clearing targetNode there is no timer and no polling: a span is finite and every span
' that starts ends in "stopped", so that transition is the moment to check ownership (see
' onAnimStateChanged). The Animation lingers in the parent until its span ends. A raw <tween>
' removed while idle or paused is not caught: a paused span never reaches "stopped", and a node
' has no destructor and no observable parent to hook instead. Clear targetNode first.
'
' The release is deferred by one frame rather than run inside the Animation's own state
' observer, because unobserving a field and removing the node from inside that field's callback
' is not something SceneGraph documents as safe. The deferral reuses the retry Timer.
sub releaseDetached()
    m.releasePending = true
    startRetryTimer()
end sub

' A trigger can arrive before this node is inserted into its parent; retry on the next frames
' until it is.
sub scheduleRetry()
    m.pendingFire = true
    startRetryTimer()
end sub

sub startRetryTimer()
    if m.retryTimer = invalid then
        m.retryTimer = createObject("roSGNode", "Timer")
        m.retryTimer.duration = 0.001
        m.retryTimer.repeat = false
        m.retryTimer.observeFieldScoped("fire", "onRetryTimerFire")
        m.top.appendChild(m.retryTimer)
    end if
    m.retryTimer.control = "start"
end sub

sub onRetryTimerFire()
    if m.releasePending then
        m.releasePending = false
        ' Re-check: a new span may have started, or the node been re-attached, since the request.
        if m.anim <> invalid then
            if m.anim.state = "stopped" and m.top.getParent() = invalid then releaseAnim()
        end if
        return
    end if
    if not m.pendingFire then return
    if m.top.targetNode = invalid then return
    fireAnimation()
end sub

' Bind the interpolator to the CURRENT target's field. Without a rebind on target change a
' pooled node recycled onto another cell keeps animating its previous owner.
sub bindField()
    ' Interpolators address a node by id, but the public API only requires a reference.
    ' Give anonymous targets a stable unique id without changing a caller-assigned id.
    if m.top.targetNode.id = "" then
        m.top.targetNode.id = "rsg-tween-" + createObject("roDeviceInfo").GetRandomUUID()
    end if
    desiredField = m.top.targetNode.id + "." + m.top.field
    if m.interp.fieldToInterp <> desiredField then
        m.interp.fieldToInterp = desiredField
    end if
end sub

' Target-node changes animate the standing target, but only after a target write.
sub onTargetNodeChanged()
    target = m.top.targetNode
    if target = invalid then
        m.lastTarget = invalid
        releaseAnim()
        return
    end if
    if m.lastTarget <> invalid then
        if target.isSameNode(m.lastTarget) then return
    end if
    m.lastTarget = target
    ' Whatever was armed belongs to the previous node; the new one starts from its own value.
    m.armed = invalid

    if m.targetWritten then fireAnimation()
end sub

sub onTargetValueChanged()
    m.useScalarTarget = true
    m.targetWritten = true
    m.valueType = detectValueType()
    fireAnimation()
end sub

sub onTargetVectorChanged()
    m.useScalarTarget = false
    m.targetWritten = true
    ' An explicit vector target forces vector2d regardless of field name.
    m.valueType = "vector2d"
    fireAnimation()
end sub

sub onControlChanged()
    if m.anim = invalid then return
    ctrl = m.top.control
    if ctrl = "" then return
    ' A stop puts the target back at the span's start, so the armed destination no longer holds.
    if ctrl = "stop" then m.armed = invalid
    m.anim.control = ctrl
end sub

' The axis mode. Every read of the axis goes through here so there is exactly one set of
' vector semantics: "x" and "y" move one component and hold the other at preserveOther,
' "all" moves the whole vector.
function resolvedAxis() as string
    axis = m.top.axis
    if axis = "x" or axis = "y" then return axis
    return "all"
end function

' Build the vector2d target from the trigger inputs (scalar auto-expansion + axis rules).
function buildVectorTarget() as object
    if not m.useScalarTarget and m.top.targetVector <> invalid and m.top.targetVector.count() >= 2 then
        return [m.top.targetVector[0], m.top.targetVector[1]]
    end if
    v = m.top.targetValue
    axis = resolvedAxis()
    preserveOther = m.top.preserveOther
    if axis = "y" then return [preserveOther, v]
    if axis = "x" then return [v, preserveOther]
    ' "all": the scalar goes on both slots (uniform scale), as the native node does.
    return [v, v]
end function

sub fireAnimation()
    ' A trigger can be written before targetNode; the native node keeps it, so hold it until
    ' onTargetNodeChanged delivers a target.
    if m.top.targetNode = invalid then
        m.pendingFire = true
        return
    end if
    if not ensureAnimReady() then
        if m.top.duration = 0 then
            snapWithoutAnim()
        else
            scheduleRetry()
        end if
        return
    end if
    m.pendingFire = false
    bindField()

    targetNode = m.top.targetNode

    if m.valueType = "float" then
        toVal = m.top.targetValue
        if not m.useScalarTarget and m.top.targetVector <> invalid and m.top.targetVector.count() >= 1 then
            toVal = m.top.targetVector[0]
        end if
        if m.top.duration = 0 then
            stopAtValue(toVal)
            targetNode.setField(m.top.field, toVal)
            return
        end if
        if isArmedFor(toVal, true, true) then return
        fromVal = targetNode.getField(m.top.field)
        armSpan(fromVal, toVal, m.top.duration)
    else
        toVec = buildVectorTarget()
        if m.top.duration = 0 then
            stopAtValue(toVec)
            targetNode.setField(m.top.field, toVec)
            return
        end if
        axis = resolvedAxis()
        if isArmedFor(toVec, axis <> "y", axis <> "x") then return
        liveVec = targetNode.getField(m.top.field)
        if liveVec = invalid then liveVec = [0, 0]
        preserveOther = m.top.preserveOther
        if axis = "y" then
            fromVec = [preserveOther, liveVec[1]]
        else if axis = "x" then
            fromVec = [liveVec[0], preserveOther]
        else
            fromVec = liveVec
        end if
        armSpan(fromVec, toVec, m.top.duration)
    end if

    date = createObject("roDateTime")
    m.top.animationStart = [date.AsSeconds(), date.GetMilliseconds()]
end sub

' The one place a span starts. Records the destination so a later write of the same one is a
' no-op (see isArmedFor). Every start reads the current ease, including a settle re-arm.
' Stop resets the target to keyValue[0], so the new keys go in first: the reset then lands on
' fromValue (the live position) rather than on the previous span's start.
sub armSpan(fromValue as dynamic, toValue as dynamic, duration as float)
    m.anim.easeFunction = m.top.easeFunction
    m.anim.duration   = duration
    m.interp.keyValue = [fromValue, toValue]
    m.anim.control    = "stop"
    m.anim.control    = "start"
    m.armed = { node: m.top.targetNode, to: toValue }
end sub

' True when `target` is the destination last armed or pinned on the current target node, on
' every owned component. Writing it again must not restart: FlexGrid re-writes the settled
' position as a settle lands, and a restart re-arms the last few pixels over the full duration,
' so the end of the settle crawls. The other renderer implementations follow the same rule. A
' target-node change and a "stop" control clear the record, so neither is ever skipped.
function isArmedFor(target as dynamic, ownX as boolean, ownY as boolean) as boolean
    if m.armed = invalid then return false
    if not m.armed.node.isSameNode(m.top.targetNode) then return false
    armedTo = m.armed.to
    if type(target) <> "roArray" then
        if type(armedTo) = "roArray" then return false
        return abs(armedTo - target) < 0.01
    end if
    if type(armedTo) <> "roArray" then return false
    if ownX and abs(armedTo[0] - target[0]) >= 0.01 then return false
    if ownY and abs(armedTo[1] - target[1]) >= 0.01 then return false
    return true
end function

' Stop resets the target to keyValue[0], so pin both keys before issuing the control.
sub stopAtValue(value as dynamic)
    m.interp.keyValue = [value, value]
    m.anim.control = "stop"
    m.armed = { node: m.top.targetNode, to: value }
end sub

' A snap needs no animation, so it lands even before this node has a parent.
sub snapWithoutAnim()
    m.pendingFire = false
    if m.valueType = invalid then m.valueType = detectValueType()
    if m.valueType = "float" then
        toVal = m.top.targetValue
        if not m.useScalarTarget and m.top.targetVector <> invalid and m.top.targetVector.count() >= 1 then
            toVal = m.top.targetVector[0]
        end if
        m.top.targetNode.setField(m.top.field, toVal)
        m.armed = { node: m.top.targetNode, to: toVal }
    else
        toVec = buildVectorTarget()
        m.top.targetNode.setField(m.top.field, toVec)
        m.armed = { node: m.top.targetNode, to: toVec }
    end if
end sub

sub onProposedStopsChanged(data as dynamic)
    if m.anim = invalid or m.interp = invalid then return
    if not ensureAnimReady() then return
    stops = data.getData()
    if stops = invalid or stops.count() = 0 then return
    if m.interp.keyValue = invalid or m.interp.keyValue.count() < 2 then return
    bindField()

    targetNode = m.top.targetNode
    kvFrom = m.interp.keyValue[0]
    kvTo   = m.interp.keyValue[1]

    if m.valueType = "float" then
        normalized = normalizeScalarStops(stops)
        stops = normalized.candidates
        if stops.count() = 0 then return
        fromPos = targetNode.getField(m.top.field)
        isIncreasing = (kvTo > kvFrom)
        isStationary = (kvTo = kvFrom)
        picked = pickStop1D(stops, fromPos, isIncreasing, isStationary, kvTo)
        index = picked[0]
        if index < 0 then
            index = 0
        else
            index = normalized.indices[index]
        end if
        closestStop = picked[1]

        originalDistance = abs(kvTo - kvFrom)
        newDistance = abs(closestStop - fromPos)
        if newDistance = 0 then
            stopAtValue(fromPos)
            fireAnimationStop(index, closestStop, 0)
            return
        end if
        newDuration = scaleSettle(m.anim.duration, originalDistance, newDistance)

        armSpan(fromPos, closestStop, newDuration)

        fireAnimationStop(index, closestStop, newDuration)
        return
    end if

    ' vector2d. One code path for every axis mode. A candidate is a whole [x, y] point, chosen
    ' once and applied to every component the axis owns: "x" and "y" own one component and hold
    ' the other where it is, "all" owns both. There is no dominant-axis selection, so a diagonal glide settles X and Y together onto one candidate.
    axis = resolvedAxis()
    normalized = normalizeVectorStops(stops, axis)
    stops = normalized.candidates
    ' No candidate of the right arity: no settle. The armed span keeps running to its own
    ' target and onAnimationStop does not fire, as for an empty proposedStops.
    if stops.count() = 0 then return

    fromVec = targetNode.getField(m.top.field)
    if fromVec = invalid then fromVec = [0, 0]

    ownX = (axis <> "y")
    ownY = (axis <> "x")
    dirX = 0
    dirY = 0
    if ownX then dirX = sgn(kvTo[0] - kvFrom[0])
    if ownY then dirY = sgn(kvTo[1] - kvFrom[1])

    ' One candidate is a destination, not a choice, so the direction-of-travel filter is
    ' dropped for it. A span that moves no owned component (FlexGrid's sticky-step arming)
    ' also drops the filter and takes the absolute-nearest candidate.
    unfiltered = (stops.count() = 1) or (dirX = 0 and dirY = 0)

    picked = pickStopVector(stops, fromVec, ownX, ownY, dirX, dirY, unfiltered)
    index = picked[0]
    if index < 0 then
        ' Nothing ahead: keep the armed span running to its own target, as the 1D path does
        ' when no candidate is accepted.
        candidate = [kvTo[0], kvTo[1]]
        index = 0
    else
        candidate = stops[index]
        ' Report the index into proposedStops as written, not into the filtered list.
        index = normalized.indices[index]
    end if

    toVec = [fromVec[0], fromVec[1]]
    if ownX then toVec[0] = candidate[0]
    if ownY then toVec[1] = candidate[1]

    ' The reported position is a scalar: the owned component for "x"/"y", and for "all" the
    ' component that travels further, which is also the one that dominated the pre-unification
    ' report.
    reportIdx = 0
    if axis = "y" then reportIdx = 1
    if axis = "all" and abs(toVec[1] - fromVec[1]) > abs(toVec[0] - fromVec[0]) then reportIdx = 1
    closestStop = toVec[reportIdx]

    newDistance = vecDistance(fromVec, toVec, ownX, ownY)
    originalDistance = vecDistance(kvFrom, kvTo, ownX, ownY)
    if newDistance = 0 then
        stopAtValue(fromVec)
        fireAnimationStop(index, closestStop, 0)
        return
    end if
    newDuration = scaleSettle(m.anim.duration, originalDistance, newDistance)

    armSpan([fromVec[0], fromVec[1]], toVec, newDuration)

    fireAnimationStop(index, closestStop, newDuration)
end sub

' Euclidean length of b - a over the owned components; an unowned component contributes 0.
function vecDistance(a as object, b as object, ownX as boolean, ownY as boolean) as float
    dx = 0
    dy = 0
    if ownX then dx = b[0] - a[0]
    if ownY then dy = b[1] - a[1]
    return sqr(dx * dx + dy * dy)
end function

' Bring `proposedStops` on a vector field to one shape, a list of [x, y] candidates, keeping
' only entries whose arity matches the value being settled. Each entry is judged on its own,
' so in a mixed list the valid entries still compete. Returns { candidates, indices }, where
' indices[k] is the proposedStops index candidates[k] came from.
'
'   - axis "x" / "y": the settled value is the one owned coordinate, so a candidate must be a
'     scalar s (only the owned component is read; [s, s] is just a carrier). An array of any
'     length, [x, y] included, is skipped and logged once per settle.
'   - axis "all": the settled value is the whole vector, so a candidate must be an [x, y]
'     pair. Scalars, and arrays of any other length, are skipped and logged once per settle.
'
' Scalars are deliberately not lifted to [s, s] under "all". That lift turned a legacy flat
' [X, Y] focus-highlight stop into two diagonal candidates [X, X] and [Y, Y]: holding left
' and releasing settled the highlight onto the row below. The same rule extends to wider
' values: a Rect2D field would take [x, y, w, h] candidates and skip anything else.
'
' Pairs are likewise not read on one component under "x" / "y": a pair there is the wrong
' arity for the one coordinate being settled, and reading half of it hides a caller that
' meant "all".
function normalizeVectorStops(stops as object, axis as string) as object
    candidates = []
    indices = []
    skipped = 0
    for i = 0 to stops.count() - 1
        candidate = stops[i]
        if axis = "all" then
            if type(candidate) = "roArray" and candidate.count() = 2 then
                candidates.push(candidate)
                indices.push(i)
            else
                skipped = skipped + 1
            end if
        else if type(candidate) = "roArray" then
            skipped = skipped + 1
        else
            candidates.push([candidate, candidate])
            indices.push(i)
        end if
    end for
    if skipped > 0 then
        if axis = "all" then
            print "RsgTweenShim: skipped "; skipped; " proposedStops entries that are not [x, y] pairs on axis "; chr(34); "all"; chr(34)
        else
            print "RsgTweenShim: skipped "; skipped; " proposedStops entries that are not scalars on axis "; chr(34); axis; chr(34)
        end if
    end if
    return { candidates: candidates, indices: indices }
end function

' Vector candidate selection. A candidate is accepted when it lies strictly ahead on every
' owned component that is moving (a component the span does not move imposes no constraint);
' among accepted candidates the nearest by Euclidean distance over the owned components wins.
' Unfiltered (single destination or stationary span) accepts everything. Returns [index] with
' -1 when nothing was accepted.
function pickStopVector(stops as object, fromVec as object, ownX as boolean, ownY as boolean, dirX as integer, dirY as integer, unfiltered as boolean) as object
    best = -1
    bestDistance = invalid
    for i = 0 to stops.count() - 1
        candidate = stops[i]
        accept = true
        if not unfiltered then
            if dirX > 0 and not (candidate[0] > fromVec[0]) then accept = false
            if dirX < 0 and not (candidate[0] < fromVec[0]) then accept = false
            if dirY > 0 and not (candidate[1] > fromVec[1]) then accept = false
            if dirY < 0 and not (candidate[1] < fromVec[1]) then accept = false
        end if
        if accept then
            distance = vecDistance(fromVec, candidate, ownX, ownY)
            if bestDistance = invalid or distance < bestDistance then
                bestDistance = distance
                best = i
            end if
        end if
    end for
    return [best]
end function

' Unified 1D candidate selection: accept strictly ahead in the direction of travel; a
' stationary span takes the absolute-nearest. Returns [index, stopValue].
' Float fields take scalar stops only, retaining the caller's original indices.
function normalizeScalarStops(stops as object) as object
    candidates = []
    indices = []
    skipped = 0
    for i = 0 to stops.count() - 1
        candidate = stops[i]
        if type(candidate) = "roArray" then
            skipped = skipped + 1
        else
            candidates.push(candidate)
            indices.push(i)
        end if
    end for
    if skipped > 0 then print "RsgTweenShim: skipped "; skipped; " proposedStops entries that are not scalars on a float field"
    return { candidates: candidates, indices: indices }
end function

function pickStop1D(stops as object, fromPos as float, isIncreasing as boolean, isStationary as boolean, defaultTo as float) as object
    closestStop = defaultTo
    minDistance = invalid
    index = -1
    for i = 0 to stops.count() - 1
        stopPosition = stops[i]
        distance = abs(stopPosition - fromPos)
        accept = false
        if isStationary then
            accept = true
        else if isIncreasing then
            if stopPosition > fromPos then accept = true
        else
            if stopPosition < fromPos then accept = true
        end if
        if accept then
            if minDistance = invalid or distance < minDistance then
                minDistance = distance
                closestStop = stopPosition
                index = i
            end if
        end if
    end for
    return [index, closestStop]
end function

' Velocity-preserving settle duration: hold the original span's units-per-second across
' the shortened distance. Zero-length span → 0.05s; floored at 0.02s.
function scaleSettle(originalDuration as float, originalDistance as float, newDistance as float) as float
    if originalDistance > 0 then
        newDuration = originalDuration * newDistance / originalDistance
    else
        newDuration = 0.05
    end if
    if newDuration < 0.02 then newDuration = 0.02
    return newDuration
end function

sub onAnimStateChanged(data as dynamic)
    ' A span has ended. If this node was detached meanwhile, nobody owns the Animation any more.
    ' Judge the live state, not the notification: a restart delivers "stopped" after armSpan has
    ' already started the next span.
    if m.anim <> invalid then
        if m.anim.state = "stopped" and m.top.getParent() = invalid then releaseDetached()
    end if
    curVal = invalid
    if m.top.targetNode <> invalid and m.top.field <> "" then
        curVal = m.top.targetNode.getField(m.top.field)
    end if
    m.top.animationState = [data.getData(), curVal]
end sub

' Keep epoch milliseconds in double precision: a 32-bit BRS integer overflows here.
sub fireAnimationStop(index as integer, stopPos as float, delaySeconds as float)
    currentTime = createObject("roDateTime")
    totalMs# = currentTime.AsSeconds() * 1000# + currentTime.GetMilliseconds() + Int(delaySeconds * 1000#)
    seconds# = Int(totalMs# / 1000#)
    milliseconds = Int(totalMs# - seconds# * 1000#)
    m.top.animationStop = [index, stopPos, [seconds#, milliseconds]]
end sub

'//# sourceMappingURL=../../bundle/components/rsg-tween-shim.brs.map