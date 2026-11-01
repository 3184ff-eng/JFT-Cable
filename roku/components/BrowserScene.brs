sub init()
 m.nav=m.top.findNode("nav")
 m.grid=m.top.findNode("grid")
 m.video=m.top.findNode("video")
 m.status=m.top.findNode("status")
 m.native=m.top.findNode("nativeResolver")
 m.native.ObserveField("status","nativeStatus")
 m.native.ObserveField("result","nativeResult")
 m.feedTask=m.top.findNode("feedTask")
 m.feedTask.ObserveField("result","feedLoaded")
 m.feedBusy=false
 m.feedUrl="https://3184ff-eng.github.io/JFT-Cable/feed.json"
 m.resolveSequence=0
 m.resolving=false
 m.catalog=ParseJson(ReadAsciiFile("pkg:/catalog.json"))
 m.reg=CreateObject("roRegistrySection","StreamLounge")
 if m.reg.Exists("feedUrl") then m.feedUrl=m.reg.Read("feedUrl")
 m.favorites={}
 m.sources={}
 if m.reg.Exists("favorites") then m.favorites=ParseJson(m.reg.Read("favorites"))
 if m.reg.Exists("sources") then m.sources=ParseJson(m.reg.Read("sources"))
 if m.favorites=invalid then m.favorites={}
 if m.sources=invalid then m.sources={}
 n=CreateObject("roSGNode","ContentNode")
 for each label in ["All titles","Movies","TV Shows","Documentaries","Playable sources","Favorites","Genres","Search","Enter stream URL","About","Resolver diagnostics","GitHub feed address","Refresh GitHub feed"]
  c=n.CreateChild("ContentNode")
  c.title=label
 end for
 m.nav.content=n
 m.nav.ObserveField("itemSelected","navigate")
 m.grid.ObserveField("itemSelected","details")
 m.video.ObserveField("state","videoState")
 m.mode="playable"
 m.nav.jumpToItem=4
 m.query=""
 m.genre="All genres"
 m.genrePanel=m.top.findNode("genrePanel")
 m.genreList=m.top.findNode("genreList")
 genres=CreateObject("roSGNode","ContentNode")
 for each genre in ["All genres","Action","Comedy","Drama","Horror","Thriller","Science Fiction","Animation","Crime","Adventure","Romance","Family","Fantasy","Documentary"]
  row=genres.CreateChild("ContentNode")
  row.title=genre
 end for
 m.genreList.content=genres
 m.genreList.ObserveField("itemSelected","genreSelected")
 renderCatalog()
 m.nav.SetFocus(true)
 if m.feedUrl<>"" then refreshFeed()
end sub

function sourceFor(item as Object) as String
 if m.feedUrl<>""
  if item.expiresAt=invalid then return ""
  now=CreateObject("roDateTime")
  if item.expiresAt<=now.AsSeconds() then return ""
  return item.url
 end if
 if m.sources.DoesExist(item.id) then return m.sources[item.id]
 return item.url
end function

sub renderCatalog()
 root=CreateObject("roSGNode","ContentNode")
 m.visible=[]
 for each item in m.catalog
  keep=true
  if m.mode="playable" then keep=(sourceFor(item)<>"")
  if m.mode="favorites" then keep=m.favorites.DoesExist(item.id)
  if m.mode="movies" then keep=(item.kind="Movie" or item.kind="Sample") and not item.documentary
  if m.mode="tv" then keep=(item.kind="Series")
  if m.mode="documentaries" then keep=item.documentary
  if m.genre<>"All genres" then keep=keep and matchesGenre(item,m.genre)
  if m.query<>"" then keep=keep and titleMatchesQuery(item.title,m.query)
  if keep
   c=root.CreateChild("ContentNode")
   c.title=item.title
   c.HDPosterUrl=item.poster
   c.shortDescriptionLine1="SOURCE NEEDED"
   if item.sourceState="episodes" then c.shortDescriptionLine1="EPISODES NEEDED"
   if item.sourceState="rate-limited" then c.shortDescriptionLine1="RETRY LATER"
   if item.sourceState="verification" then c.shortDescriptionLine1="CHECK REQUIRED"
   if sourceFor(item)<>"" then c.shortDescriptionLine1="STREAM CONNECTED"
   m.visible.Push(item)
  end if
 end for
 m.grid.content=root
 if m.visible.Count()>0 then m.grid.jumpToItem=0
 m.status.text=m.visible.Count().ToStr()+" titles | "+m.genre+" | OK: details | Back: menu"
 if m.query<>"" then m.status.text=m.visible.Count().ToStr()+" results for: "+m.query+" | All categories and genres"
 if m.visible.Count()=0
  m.status.text="No matching titles in the saved catalog. Try fewer words or another title."
 end if
end sub

sub navigate()
 i=m.nav.itemSelected
 if i>=0 and i<=5
  m.query=""
  modes=["all","movies","tv","documentaries","playable","favorites"]
  m.mode=modes[i]
  renderCatalog()
  if m.visible.Count()>0 then m.grid.SetFocus(true)
 else if i=6
  m.genrePanel.visible=true
  m.genreList.SetFocus(true)
 else if i=7
  openKeyboard("search","Search all saved titles",m.query)
 else if i=8
  openKeyboard("custom","Enter an HLS or MP4 address","")
 else if i=11
  openKeyboard("feed","Enter GitHub Pages feed.json URL",m.feedUrl)
 else if i=12
  refreshFeed()
 else if i=10
  startNative(true)
 else
  d=CreateObject("roSGNode","Dialog")
  d.title="About JFT cable"
  d.message="Native video browser with search and saved favorites. Catalog titles are listings, not guaranteed playable streams. Connected links may expire. Replace stream updates a title's source. This app does not render websites or resolve 1HD links automatically."
  d.buttons=["Close"]
  d.ObserveField("buttonSelected","dismiss")
  m.top.dialog=d
 end if
end sub

function matchesGenre(item as Object,genre as String) as Boolean
 for each value in item.genres
  if value=genre then return true
 end for
 return false
end function

sub genreSelected()
 m.genre=m.genreList.content.GetChild(m.genreList.itemSelected).title
 m.genrePanel.visible=false
 renderCatalog()
 if m.visible.Count()>0
  m.grid.SetFocus(true)
 else
  m.nav.SetFocus(true)
 end if
end sub

sub details()
 m.item=m.visible[m.grid.itemSelected]
 d=CreateObject("roSGNode","Dialog")
 d.title=m.item.title
 d.message=m.item.description
 m.actions=[]
 buttons=[]
 if sourceFor(m.item)<>""
  buttons.Push("Play")
  m.actions.Push("play")
 end if
 if m.item.videoCode<>invalid
  buttons.Push("Refresh source on Roku (test)")
  m.actions.Push("native")
 end if
 if m.favorites.DoesExist(m.item.id)
  buttons.Push("Remove favorite")
 else
  buttons.Push("Add favorite")
 end if
 m.actions.Push("favorite")
 buttons.Push("Replace stream")
 m.actions.Push("replace")
 buttons.Push("Close")
 m.actions.Push("close")
 d.buttons=buttons
 d.ObserveField("buttonSelected","detailAction")
 m.top.dialog=d
end sub

sub detailAction()
 action=m.actions[m.top.dialog.buttonSelected]
 m.top.dialog.close=true
 if action="play"
  if sourceFor(m.item)=""
   m.status.text="Source expired. Run the GitHub refresh workflow, then Refresh GitHub feed."
  else
   playStream(sourceFor(m.item),m.item.title)
  end if
 else if action="native"
  startNative(false)
 else if action="favorite"
  if m.favorites.DoesExist(m.item.id)
   m.favorites.Delete(m.item.id)
  else
   m.favorites[m.item.id]=true
  end if
  m.reg.Write("favorites",FormatJson(m.favorites))
  m.reg.Flush()
  renderCatalog()
  m.grid.SetFocus(true)
 else if action="replace"
  openKeyboard("replace","Replace direct stream URL",sourceFor(m.item))
 else
  m.grid.SetFocus(true)
 end if
end sub

sub dismiss()
 m.top.dialog.close=true
 m.nav.SetFocus(true)
end sub

sub openKeyboard(mode as String,title as String,value as String)
 m.entryMode=mode
 d=CreateObject("roSGNode","KeyboardDialog")
 d.title=title
 d.text=value
 d.buttons=["Continue","Cancel"]
 if mode="search" then d.buttons=["Search","Cancel"]
 d.ObserveField("buttonSelected","entered")
 m.top.dialog=d
end sub

sub entered()
 d=m.top.dialog
 accepted=(d.buttonSelected=0)
 value=d.text.Trim()
 d.close=true
 m.nav.SetFocus(true)
 if not accepted then return
 if m.entryMode="search"
  m.mode="all"
  m.genre="All genres"
  m.nav.jumpToItem=0
  m.query=value
  renderCatalog()
  if m.visible.Count()>0 then m.grid.SetFocus(true)
  return
 end if
 if Left(LCase(value),8)<>"https://" and Left(LCase(value),7)<>"http://"
  m.status.text="Please enter a full HTTP or HTTPS video URL."
  return
 end if
 if m.entryMode="feed"
  if Left(LCase(value),8)<>"https://"
   m.status.text="The feed address must use HTTPS."
   return
  end if
  m.feedUrl=value
  m.reg.Write("feedUrl",value)
  m.reg.Flush()
  refreshFeed()
  return
 end if
 if m.entryMode="replace"
  m.sources[m.item.id]=value
  m.reg.Write("sources",FormatJson(m.sources))
  m.reg.Flush()
  renderCatalog()
  playStream(value,m.item.title)
 else
  playStream(value,"Custom stream")
 end if
end sub

sub playStream(url as String,title as String)
 c=CreateObject("roSGNode","ContentNode")
 c.url=url
 c.title=title
 c.streamFormat="hls"
 if Instr(1,LCase(url),".mp4")>0 then c.streamFormat="mp4"
 m.video.content=c
 m.video.visible=true
 m.video.SetFocus(true)
 m.video.control="play"
end sub

sub videoState()
 if m.video.state="error"
  m.status.text="Playback failed: "+m.video.errorMsg+". The source may have expired. Use Replace stream in title details."
  closeVideo()
 else if m.video.state="finished"
  closeVideo()
 end if
end sub

sub closeVideo()
 m.video.control="stop"
 m.video.visible=false
 if m.visible.Count()>0
  m.grid.SetFocus(true)
 else
  m.nav.SetFocus(true)
 end if
end sub

function onKeyEvent(key as String,press as Boolean) as Boolean
 if not press then return false
 if key="back" and m.resolving
  m.native.cancel=m.resolveSequence.ToStr()
  m.resolving=false
  m.status.text="Native resolution cancelled."
  m.nav.SetFocus(true)
  return true
 end if
 if key="back" and m.genrePanel.visible
  m.genrePanel.visible=false
  m.nav.SetFocus(true)
  return true
 end if
 if key="back" and m.video.visible
  closeVideo()
  return true
 end if
 if key="left" or key="back"
  if m.grid.HasFocus()
   m.nav.SetFocus(true)
   return true
  end if
 end if
 if key="right" and m.nav.HasFocus() and m.visible.Count()>0
  m.grid.SetFocus(true)
  return true
 end if
 return false
end function

sub startNative(diagnostic as Boolean)
 if m.resolving
  m.status.text="A resolver request is already running. Back cancels it."
  return
 end if
 if not m.native.ready
  m.status.text="The native TypeScript resolver is not ready. Check OS 16 beta support and developer logs."
  return
 end if
 m.resolveSequence=m.resolveSequence+1
 request={requestId:m.resolveSequence.ToStr(),diagnostic:diagnostic}
 if not diagnostic
  request.title=m.item.title
  request.videoCode=m.item.videoCode
  request.kind=m.item.kind
  m.resolveItem=m.item
 end if
 m.resolving=true
 m.native.request=FormatJson(request)
end sub

sub nativeStatus()
 if m.resolving then m.status.text=m.native.status+" | Back cancels"
end sub

sub nativeResult()
 result=ParseJson(m.native.result)
 if result=invalid then return
 if result.requestId<>m.resolveSequence.ToStr() then return
 m.resolving=false
 if not result.ok
  m.status.text="Native resolver: "+result.error
  m.nav.SetFocus(true)
  return
 end if
 if result.diagnostic
  m.status.text="Native runtime, signing, proof arithmetic and AES-GCM self-tests passed. Try Refresh source on a mapped movie."
  m.nav.SetFocus(true)
  return
 end if
 if result.url=invalid or result.url=""
  m.status.text="Native resolver returned no stream."
  return
 end if
 m.sources[m.resolveItem.id]=result.url
 m.reg.Write("sources",FormatJson(m.sources))
 m.reg.Flush()
 m.status.text="Fresh source retrieved entirely on Roku."
 playStream(result.url,m.resolveItem.title)
end sub

'//# sourceMappingURL=../../bundle/components/BrowserScene.brs.map
sub refreshFeed()
 if m.feedBusy then return
 if m.feedUrl=""
  m.status.text="Set the GitHub feed address first."
  return
 end if
 m.feedBusy=true
 m.feedTask.control="STOP"
 m.feedTask.url=m.feedUrl
 m.status.text="Loading GitHub catalogue..."
 m.feedTask.control="RUN"
end sub

sub feedLoaded()
 m.feedBusy=false
 result=m.feedTask.result
 if not result.ok
  m.status.text=result.message
  return
 end if
 ' Use only matching IDs from the bundled catalogue; remote entries provide sources.
 for each item in m.catalog
  item.url=""
  item.expiresAt=0
  item.sourceState="source-needed"
  for each incoming in result.items
   if incoming.id=item.id
    if GetInterface(incoming.url,"ifString")<>invalid and GetInterface(incoming.expiresAt,"ifIntOps")<>invalid
     if Left(incoming.url,8)="https://"
      item.url=incoming.url
      item.expiresAt=incoming.expiresAt
     end if
    end if
    exit for
   end if
  end for
 end for
 renderCatalog()
 m.status.text="GitHub feed loaded. Sources expire; playback from your network is still subject to provider access."
end sub
