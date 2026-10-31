"use strict";
(() => {
  var __async = (__this, __arguments, generator) => {
    return new Promise((resolve, reject) => {
      var fulfilled = (value) => {
        try {
          step(generator.next(value));
        } catch (e) {
          reject(e);
        }
      };
      var rejected = (value) => {
        try {
          step(generator.throw(value));
        } catch (e) {
          reject(e);
        }
      };
      var step = (x) => x.done ? resolve(x.value) : Promise.resolve(x.value).then(fulfilled, rejected);
      step((generator = generator.apply(__this, __arguments)).next());
    });
  };

  // node_modules/@roku-sdk/runtime/src/has-feature.ts
  var featureSupport = /* @__PURE__ */ new Map();
  function hasFeature(key) {
    const cached = featureSupport.get(key);
    if (cached !== void 0)
      return cached;
    const supported = typeof roku !== "undefined" && typeof roku?.hasFeature === "function" ? roku.hasFeature(key) : false;
    featureSupport.set(key, supported);
    return supported;
  }

  // node_modules/@roku-sdk/interfaces/src/roku-compat.ts
  var COMPAT_MARKER = "__rsgCompat";
  function installRokuCompat() {
    const g = globalThis;
    const real = g.roku;
    if (real && real[COMPAT_MARKER]) {
      return;
    }
    const hasOwn = (obj, prop) => Object.prototype.hasOwnProperty.call(obj, prop);
    const compat = new Proxy({}, {
      // Resolution order: local writes/overrides on the proxy → firmware-provided
      // `roku` member → legacy bare global (firmware without the `roku` namespace).
      get(target, prop) {
        if (prop === COMPAT_MARKER) {
          return true;
        }
        if (hasOwn(target, prop)) {
          return target[prop];
        }
        if (real && real[prop] !== void 0) {
          return real[prop];
        }
        return g[prop];
      },
      has(target, prop) {
        if (prop === COMPAT_MARKER) {
          return true;
        }
        return hasOwn(target, prop) || !!real && prop in real || prop in g;
      }
    });
    g.roku = compat;
  }
  installRokuCompat();

  // node_modules/@roku-sdk/interfaces/src/runtime/enums.ts
  var RuntimeInterfaces = /* @__PURE__ */ (function(RuntimeInterfaces2) {
    RuntimeInterfaces2["CEC"] = "CEC";
    RuntimeInterfaces2["LaunchConfig"] = "LaunchConfig";
    RuntimeInterfaces2["Registry"] = "Registry";
    RuntimeInterfaces2["AppInfo"] = "AppInfo";
    RuntimeInterfaces2["DeviceInfo"] = "DeviceInfo";
    RuntimeInterfaces2["LoggerAPI"] = "LoggerAPI";
    RuntimeInterfaces2["AppMemoryMonitor"] = "AppMemoryMonitor";
    RuntimeInterfaces2["Input"] = "Input";
    RuntimeInterfaces2["LifecycleAPI"] = "LifecycleAPI";
    RuntimeInterfaces2["FileSystem"] = "FileSystem";
    RuntimeInterfaces2["FontMeasureApi"] = "FontMeasureApi";
    RuntimeInterfaces2["SignalBeacon"] = "SignalBeacon";
    RuntimeInterfaces2["AudioGuide"] = "AudioGuide";
    RuntimeInterfaces2["TextToSpeech"] = "TextToSpeech";
    RuntimeInterfaces2["ComponentLibraryFactory"] = "ComponentLibraryFactory";
    RuntimeInterfaces2["HdmiStatus"] = "HdmiStatus";
    return RuntimeInterfaces2;
  })({});

  // node_modules/@roku-sdk/interfaces/src/types.ts
  var domNodeSymbol = /* @__PURE__ */ Symbol("domNode");
  var AnchorNodeFieldTypes = {
    Null: () => () => null,
    Boolean: (d = true) => () => d,
    Number: (d = 0) => () => d,
    Float: (d = 0) => {
      const fn = () => d;
      fn.isFloat = true;
      return fn;
    },
    String: (d = "") => () => d,
    Array: (d = []) => () => d,
    Object: (d = {}) => () => d
  };

  // node_modules/@roku-sdk/common/src/build-variables.ts
  function getBuildVariable(variable, fallback) {
    return typeof variable !== "undefined" && variable !== "" ? variable : fallback;
  }

  // node_modules/@roku-sdk/common/src/logger.ts
  var { getRuntimeSingletonSync, LogLevel } = roku;
  var loggerAPI = getRuntimeSingletonSync(RuntimeInterfaces.LoggerAPI);
  var baseLogLevelStr = getBuildVariable("INFO", "INFO");
  var currentLogLevelStr = getBuildVariable("", "ERROR");
  var baseLevel = LogLevel[baseLogLevelStr.toUpperCase()] ?? LogLevel.INFO;
  var currentLevel = LogLevel[currentLogLevelStr.toUpperCase()] ?? LogLevel.ERROR;
  var logSourceFilter = null;
  function createLogger(source = "") {
    const loggerRef = loggerAPI.getLoggerRef(source);
    const logHandlers = [];
    function logByLevel(loggerRef2, level, messageProvider, logSourceSuffix) {
      if (baseLevel <= level && currentLevel <= level && (logSourceFilter === null || source.startsWith(logSourceFilter))) {
        const message = messageProvider();
        loggerAPI.logDevConsole(loggerRef2, level, message, logSourceSuffix);
        for (const handler of logHandlers) {
          handler(source, level, message);
        }
      }
    }
    const logger2 = {
      trace: (messageProvider, logSourceSuffix) => {
        logByLevel(loggerRef, LogLevel.TRACE, messageProvider, logSourceSuffix);
      },
      debug: (messageProvider, logSourceSuffix) => {
        logByLevel(loggerRef, LogLevel.DEBUG, messageProvider, logSourceSuffix);
      },
      info: (messageProvider, logSourceSuffix) => {
        logByLevel(loggerRef, LogLevel.INFO, messageProvider, logSourceSuffix);
      },
      warn: (messageProvider, logSourceSuffix) => {
        logByLevel(loggerRef, LogLevel.WARN, messageProvider, logSourceSuffix);
      },
      error: (messageProvider, logSourceSuffix) => {
        logByLevel(loggerRef, LogLevel.ERROR, messageProvider, logSourceSuffix);
      },
      getLogger: (childSource) => {
        return createLogger(source ? `${source}.${childSource}` : childSource);
      },
      // Log handler registration methods
      registerLogHandler: (handler) => {
        logHandlers.push(handler);
      },
      unregisterLogHandler: (handler) => {
        const index = logHandlers.indexOf(handler);
        if (index !== -1) {
          logHandlers.splice(index, 1);
        }
      },
      __loggerRef: loggerRef
    };
    ;
    return logger2;
  }
  var logger = createLogger();

  // node_modules/@roku-sdk/common/src/sd-helper.ts
  var sdLogger = logger.getLogger("sd");
  var createSDHelper = (api) => {
    const createFullObject2 = (props, tracked = /* @__PURE__ */ new WeakSet()) => {
      if (tracked.has(props)) {
        sdLogger.error(() => "Circular reference detected in object");
        throw new Error("Circular reference detected in object");
      }
      tracked.add(props);
      const objRef = api.createObject();
      Object.entries(props).forEach(([prop, value]) => {
        switch (typeof value) {
          case "number":
            if (Number.isInteger(value)) {
              api.insertInt(objRef, prop, value);
            } else {
              api.insertFloat(objRef, prop, value);
            }
            break;
          case "boolean":
            api.insertBool(objRef, prop, value);
            break;
          case "string":
            api.insertString(objRef, prop, value);
            break;
          case "object":
            if (value === null) {
              api.insertNull(objRef, prop);
            } else if (Array.isArray(value)) {
              const arrayRef = createFullArray2(value, tracked);
              api.insertArray(objRef, prop, arrayRef);
            } else {
              const objectRef = createFullObject2(value, tracked);
              api.insertObject(objRef, prop, objectRef);
            }
            break;
        }
      });
      return objRef;
    };
    const createFullArray2 = (array, tracked = /* @__PURE__ */ new WeakSet()) => {
      ;
      if (tracked.has(array)) {
        sdLogger.error(() => "Circular reference detected in array");
        throw new Error("Circular reference detected in array");
      }
      tracked.add(array);
      const arrayRef = api.createArray();
      array.forEach((value) => {
        switch (typeof value) {
          case "boolean":
            api.appendBool(arrayRef, value);
            break;
          case "number":
            if (Number.isInteger(value)) {
              api.appendInt(arrayRef, value);
            } else {
              api.appendFloat(arrayRef, value);
            }
            break;
          case "string":
            api.appendString(arrayRef, value);
            break;
          case "object":
            if (value === null) {
              api.appendNull(arrayRef);
            } else if (Array.isArray(value)) {
              const nestedArrayRef = createFullArray2(value, tracked);
              api.appendArray(arrayRef, nestedArrayRef);
            } else {
              const objectRef = createFullObject2(value, tracked);
              api.appendObject(arrayRef, objectRef);
            }
            break;
        }
      });
      return arrayRef;
    };
    const commit = () => {
    };
    return {
      createFullObject: createFullObject2,
      createFullArray: createFullArray2,
      commit
    };
  };

  // node_modules/@roku-sdk/common/src/string-interner.ts
  var internStringApi;
  var reverseMap;
  var forwardMap;
  function registerInternStringApi(i) {
    reverseMap = /* @__PURE__ */ new Map();
    forwardMap = /* @__PURE__ */ new Map();
    internStringApi = i;
  }
  function assertInternStringApi() {
    if (!internStringApi) {
      throw new Error("InternStringApi not registered");
    }
  }
  var stringInterner = {
    internString: (str) => {
      assertInternStringApi();
      let ref = forwardMap.get(str);
      if (ref) {
        return ref;
      }
      ref = internStringApi.internString(str);
      forwardMap.set(str, ref);
      reverseMap.set(ref, str);
      return ref;
    },
    getStringByInternedRef: (ref) => {
      assertInternStringApi();
      const str = reverseMap.get(ref);
      if (!str) {
        throw new Error(`String for ref ${ref} not found`);
      }
      return str;
    }
  };

  // node_modules/@roku-sdk/common/src/transaction.ts
  var transactionApi;
  var transaction = void 0;
  var precommitHooks = [];
  var transactionStartHooks = [];
  var txLogger = logger.getLogger("tx");
  function registerTransactionApi(incomingTransactionApi) {
    transactionApi = incomingTransactionApi;
  }
  function registerPreCommitHook(preCommitHook) {
    precommitHooks.push(preCommitHook);
  }
  var txFlowId;
  function getTransactionManager() {
    const commit = () => {
      if (!transaction || !transaction.inTransaction) {
        txLogger.warn(() => "No transaction in progress to commit.");
        return;
      }
      precommitHooks.forEach((hook) => {
        hook();
      });
      ;
      const txFlowIdToEnd = txFlowId;
      if (txFlowIdToEnd !== void 0) {
        roku.perfetto?.flowEvent(txFlowIdToEnd, "transaction.commit");
      }
      transactionApi?.end(txFlowIdToEnd);
      txFlowId = void 0;
      transaction = void 0;
    };
    const startTransaction = () => {
      if (!transaction) {
        txFlowId = Math.floor(Math.random() * 2147483647);
        roku.perfetto?.flowEvent(txFlowId, "transaction.start");
        ;
        transactionApi?.start();
        transactionStartHooks.forEach((hook) => {
          hook();
        });
        transaction = {
          inTransaction: true
        };
        Promise.resolve().then(commit);
      }
      return transaction;
    };
    return {
      startTransaction,
      inTransaction: () => {
        return transaction?.inTransaction;
      },
      commitEarly: () => {
        commit();
      }
    };
  }
  var transactionManager = getTransactionManager();

  // node_modules/solid-js/dist/solid.js
  var sharedConfig = {
    context: void 0,
    registry: void 0,
    effects: void 0,
    done: false,
    getContextId() {
      return getContextId(this.context.count);
    },
    getNextContextId() {
      return getContextId(this.context.count++);
    }
  };
  function getContextId(count) {
    const num = String(count), len = num.length - 1;
    return sharedConfig.context.id + (len ? String.fromCharCode(96 + len) : "") + num;
  }
  function setHydrateContext(context) {
    sharedConfig.context = context;
  }
  function nextHydrateContext() {
    return {
      ...sharedConfig.context,
      id: sharedConfig.getNextContextId(),
      count: 0
    };
  }
  var IS_DEV = false;
  var equalFn = (a, b) => a === b;
  var $PROXY = /* @__PURE__ */ Symbol("solid-proxy");
  var SUPPORTS_PROXY = typeof Proxy === "function";
  var signalOptions = {
    equals: equalFn
  };
  var ERROR = null;
  var runEffects = runQueue;
  var STALE = 1;
  var PENDING = 2;
  var UNOWNED = {
    owned: null,
    cleanups: null,
    context: null,
    owner: null
  };
  var Owner = null;
  var Transition = null;
  var Scheduler = null;
  var ExternalSourceConfig = null;
  var Listener = null;
  var Updates = null;
  var Effects = null;
  var ExecCount = 0;
  function createRoot(fn, detachedOwner) {
    const listener = Listener, owner = Owner, unowned = fn.length === 0, current = detachedOwner === void 0 ? owner : detachedOwner, root = unowned ? UNOWNED : {
      owned: null,
      cleanups: null,
      context: current ? current.context : null,
      owner: current
    }, updateFn = unowned ? fn : () => fn(createDisposer(root));
    Owner = root;
    Listener = null;
    try {
      return runUpdates(updateFn, true);
    } finally {
      Listener = listener;
      Owner = owner;
    }
  }
  function createDisposer(root) {
    return () => untrack(() => cleanNode(root));
  }
  function createSignal(value, options) {
    options = options ? Object.assign({}, signalOptions, options) : signalOptions;
    const s = {
      value,
      observers: null,
      observerSlots: null,
      comparator: options.equals || void 0
    };
    const setter = (value2) => {
      if (typeof value2 === "function") {
        if (Transition && Transition.running && Transition.sources.has(s))
          value2 = value2(s.tValue);
        else
          value2 = value2(s.value);
      }
      return writeSignal(s, value2);
    };
    return [readSignal.bind(s), setter];
  }
  function createRenderEffect(fn, value, options) {
    const c = createComputation(fn, value, false, STALE);
    if (Scheduler && Transition && Transition.running)
      Updates.push(c);
    else
      updateComputation(c);
  }
  function createEffect(fn, value, options) {
    runEffects = runUserEffects;
    const c = createComputation(fn, value, false, STALE), s = SuspenseContext && useContext(SuspenseContext);
    if (s)
      c.suspense = s;
    if (!options || !options.render)
      c.user = true;
    Effects ? Effects.push(c) : updateComputation(c);
  }
  function createMemo(fn, value, options) {
    options = options ? Object.assign({}, signalOptions, options) : signalOptions;
    const c = createComputation(fn, value, true, 0);
    c.observers = null;
    c.observerSlots = null;
    c.comparator = options.equals || void 0;
    if (Scheduler && Transition && Transition.running) {
      c.tState = STALE;
      Updates.push(c);
    } else
      updateComputation(c);
    return readSignal.bind(c);
  }
  function untrack(fn) {
    if (!ExternalSourceConfig && Listener === null)
      return fn();
    const listener = Listener;
    Listener = null;
    try {
      if (ExternalSourceConfig)
        return ExternalSourceConfig.untrack(fn);
      return fn();
    } finally {
      Listener = listener;
    }
  }
  function onMount(fn) {
    createEffect(() => untrack(fn));
  }
  function onCleanup(fn) {
    if (Owner === null)
      ;
    else if (Owner.cleanups === null)
      Owner.cleanups = [fn];
    else
      Owner.cleanups.push(fn);
    return fn;
  }
  function catchError(fn, handler) {
    ERROR || (ERROR = /* @__PURE__ */ Symbol("error"));
    Owner = createComputation(void 0, void 0, true);
    Owner.context = {
      ...Owner.context,
      [ERROR]: [handler]
    };
    if (Transition && Transition.running)
      Transition.sources.add(Owner);
    try {
      return fn();
    } catch (err) {
      handleError(err);
    } finally {
      Owner = Owner.owner;
    }
  }
  function getOwner() {
    return Owner;
  }
  function startTransition(fn) {
    if (Transition && Transition.running) {
      fn();
      return Transition.done;
    }
    const l = Listener;
    const o = Owner;
    return Promise.resolve().then(() => {
      Listener = l;
      Owner = o;
      let t;
      if (Scheduler || SuspenseContext) {
        t = Transition || (Transition = {
          sources: /* @__PURE__ */ new Set(),
          effects: [],
          promises: /* @__PURE__ */ new Set(),
          disposed: /* @__PURE__ */ new Set(),
          queue: /* @__PURE__ */ new Set(),
          running: true
        });
        t.done || (t.done = new Promise((res) => t.resolve = res));
        t.running = true;
      }
      runUpdates(fn, false);
      Listener = Owner = null;
      return t ? t.done : void 0;
    });
  }
  var _ref5 = /* @__PURE__ */ createSignal(false);
  var transPending = _ref5[0];
  var setTransPending = _ref5[1];
  function useContext(context) {
    let value;
    return Owner && Owner.context && (value = Owner.context[context.id]) !== void 0 ? value : context.defaultValue;
  }
  var SuspenseContext;
  function readSignal() {
    const runningTransition = Transition && Transition.running;
    if (this.sources && (runningTransition ? this.tState : this.state)) {
      if ((runningTransition ? this.tState : this.state) === STALE)
        updateComputation(this);
      else {
        const updates = Updates;
        Updates = null;
        runUpdates(() => lookUpstream(this), false);
        Updates = updates;
      }
    }
    if (Listener) {
      const observers = this.observers;
      if (!observers || observers[observers.length - 1] !== Listener) {
        const sSlot = observers ? observers.length : 0;
        if (!Listener.sources) {
          Listener.sources = [this];
          Listener.sourceSlots = [sSlot];
        } else {
          Listener.sources.push(this);
          Listener.sourceSlots.push(sSlot);
        }
        if (!observers) {
          this.observers = [Listener];
          this.observerSlots = [Listener.sources.length - 1];
        } else {
          observers.push(Listener);
          this.observerSlots.push(Listener.sources.length - 1);
        }
      }
    }
    if (runningTransition && Transition.sources.has(this))
      return this.tValue;
    return this.value;
  }
  function writeSignal(node, value, isComp) {
    let current = Transition && Transition.running && Transition.sources.has(node) ? node.tValue : node.value;
    if (!node.comparator || !node.comparator(current, value)) {
      if (Transition) {
        const TransitionRunning = Transition.running;
        if (TransitionRunning || !isComp && Transition.sources.has(node)) {
          Transition.sources.add(node);
          node.tValue = value;
        }
        if (!TransitionRunning)
          node.value = value;
      } else
        node.value = value;
      if (node.observers && node.observers.length) {
        runUpdates(() => {
          for (let i = 0; i < node.observers.length; i += 1) {
            const o = node.observers[i];
            const TransitionRunning = Transition && Transition.running;
            if (TransitionRunning && Transition.disposed.has(o))
              continue;
            if (TransitionRunning ? !o.tState : !o.state) {
              if (o.pure)
                Updates.push(o);
              else
                Effects.push(o);
              if (o.observers)
                markDownstream(o);
            }
            if (!TransitionRunning)
              o.state = STALE;
            else
              o.tState = STALE;
          }
          if (Updates.length > 1e6) {
            Updates = [];
            if (IS_DEV)
              ;
            throw new Error();
          }
        }, false);
      }
    }
    return value;
  }
  function updateComputation(node) {
    if (!node.fn)
      return;
    cleanNode(node);
    const time = ExecCount;
    runComputation(node, Transition && Transition.running && Transition.sources.has(node) ? node.tValue : node.value, time);
    if (Transition && !Transition.running && Transition.sources.has(node)) {
      queueMicrotask(() => {
        runUpdates(() => {
          Transition && (Transition.running = true);
          Listener = Owner = node;
          runComputation(node, node.tValue, time);
          Listener = Owner = null;
        }, false);
      });
    }
  }
  function runComputation(node, value, time) {
    let nextValue;
    const owner = Owner, listener = Listener;
    Listener = Owner = node;
    try {
      nextValue = node.fn(value);
    } catch (err) {
      if (node.pure) {
        if (Transition && Transition.running) {
          node.tState = STALE;
          node.tOwned && node.tOwned.forEach(cleanNode);
          node.tOwned = void 0;
        } else {
          node.state = STALE;
          node.owned && node.owned.forEach(cleanNode);
          node.owned = null;
        }
      }
      node.updatedAt = time + 1;
      return handleError(err);
    } finally {
      Listener = listener;
      Owner = owner;
    }
    if (!node.updatedAt || node.updatedAt <= time) {
      if (node.updatedAt != null && "observers" in node) {
        writeSignal(node, nextValue, true);
      } else if (Transition && Transition.running && node.pure) {
        if (!Transition.sources.has(node))
          node.value = nextValue;
        Transition.sources.add(node);
        node.tValue = nextValue;
      } else
        node.value = nextValue;
      node.updatedAt = time;
    }
  }
  function createComputation(fn, init, pure, state = STALE, options) {
    const c = {
      fn,
      state,
      updatedAt: null,
      owned: null,
      sources: null,
      sourceSlots: null,
      cleanups: null,
      value: init,
      owner: Owner,
      context: Owner ? Owner.context : null,
      pure
    };
    if (Transition && Transition.running) {
      c.state = 0;
      c.tState = state;
    }
    if (Owner === null)
      ;
    else if (Owner !== UNOWNED) {
      if (Transition && Transition.running && Owner.pure) {
        if (!Owner.tOwned)
          Owner.tOwned = [c];
        else
          Owner.tOwned.push(c);
      } else {
        if (!Owner.owned)
          Owner.owned = [c];
        else
          Owner.owned.push(c);
      }
    }
    if (ExternalSourceConfig && c.fn) {
      const sourceFn = c.fn;
      const _ref6 = createSignal(void 0, {
        equals: false
      }), track = _ref6[0], trigger = _ref6[1];
      const ordinary = ExternalSourceConfig.factory(sourceFn, trigger);
      onCleanup(() => ordinary.dispose());
      let inTransition;
      let trackedOrdinary = false;
      const triggerInTransition = () => startTransition(trigger).then(() => {
        if (inTransition) {
          inTransition.dispose();
          inTransition = void 0;
          if (!trackedOrdinary)
            trigger();
        }
      });
      c.fn = (x) => {
        track();
        if (Transition && Transition.running) {
          if (!inTransition)
            inTransition = ExternalSourceConfig.factory(sourceFn, triggerInTransition);
          return inTransition.track(x);
        }
        trackedOrdinary = true;
        return ordinary.track(x);
      };
    }
    return c;
  }
  function runTop(node) {
    const runningTransition = Transition && Transition.running;
    if ((runningTransition ? node.tState : node.state) === 0)
      return;
    if ((runningTransition ? node.tState : node.state) === PENDING)
      return lookUpstream(node);
    if (node.suspense && untrack(node.suspense.inFallback))
      return node.suspense.effects.push(node);
    const ancestors = [node];
    while ((node = node.owner) && (!node.updatedAt || node.updatedAt < ExecCount)) {
      if (runningTransition && Transition.disposed.has(node))
        return;
      if (runningTransition ? node.tState : node.state)
        ancestors.push(node);
    }
    for (let i = ancestors.length - 1; i >= 0; i--) {
      node = ancestors[i];
      if (runningTransition) {
        let top = node, prev = ancestors[i + 1];
        while ((top = top.owner) && top !== prev) {
          if (Transition.disposed.has(top))
            return;
        }
      }
      if ((runningTransition ? node.tState : node.state) === STALE) {
        updateComputation(node);
      } else if ((runningTransition ? node.tState : node.state) === PENDING) {
        const updates = Updates;
        Updates = null;
        runUpdates(() => lookUpstream(node, ancestors[0]), false);
        Updates = updates;
      }
    }
  }
  function runUpdates(fn, init) {
    if (Updates)
      return fn();
    let wait = false;
    if (!init)
      Updates = [];
    if (Effects)
      wait = true;
    else
      Effects = [];
    ExecCount++;
    try {
      const res = fn();
      completeUpdates(wait);
      return res;
    } catch (err) {
      if (!wait)
        Effects = null;
      Updates = null;
      handleError(err);
    }
  }
  function completeUpdates(wait) {
    if (Updates) {
      if (Scheduler && Transition && Transition.running)
        scheduleQueue(Updates);
      else
        runQueue(Updates);
      Updates = null;
    }
    if (wait)
      return;
    let res;
    if (Transition) {
      if (!Transition.promises.size && !Transition.queue.size) {
        const sources = Transition.sources;
        const disposed = Transition.disposed;
        Effects.push.apply(Effects, Transition.effects);
        res = Transition.resolve;
        for (const e2 of Effects) {
          "tState" in e2 && (e2.state = e2.tState);
          delete e2.tState;
        }
        Transition = null;
        runUpdates(() => {
          for (const d of disposed)
            cleanNode(d);
          for (const v of sources) {
            v.value = v.tValue;
            if (v.owned) {
              for (let i = 0, len = v.owned.length; i < len; i++)
                cleanNode(v.owned[i]);
            }
            if (v.tOwned)
              v.owned = v.tOwned;
            delete v.tValue;
            delete v.tOwned;
            v.tState = 0;
          }
          setTransPending(false);
        }, false);
      } else if (Transition.running) {
        Transition.running = false;
        Transition.effects.push.apply(Transition.effects, Effects);
        Effects = null;
        setTransPending(true);
        return;
      }
    }
    const e = Effects;
    Effects = null;
    if (e.length)
      runUpdates(() => runEffects(e), false);
    if (res)
      res();
  }
  function runQueue(queue) {
    for (let i = 0; i < queue.length; i++)
      runTop(queue[i]);
  }
  function scheduleQueue(queue) {
    const _loop_1 = (i) => {
      const item = queue[i];
      const tasks = Transition.queue;
      if (!tasks.has(item)) {
        tasks.add(item);
        Scheduler(() => {
          tasks.delete(item);
          runUpdates(() => {
            Transition.running = true;
            runTop(item);
          }, false);
          Transition && (Transition.running = false);
        });
      }
    };
    for (let i = 0; i < queue.length; i++) {
      _loop_1(i);
    }
  }
  function runUserEffects(queue) {
    let i, userLength = 0;
    for (i = 0; i < queue.length; i++) {
      const e = queue[i];
      if (!e.user)
        runTop(e);
      else
        queue[userLength++] = e;
    }
    if (sharedConfig.context) {
      if (sharedConfig.count) {
        sharedConfig.effects || (sharedConfig.effects = []);
        sharedConfig.effects.push(...queue.slice(0, userLength));
        return;
      }
      setHydrateContext();
    }
    if (sharedConfig.effects && (sharedConfig.done || !sharedConfig.count)) {
      queue = [...sharedConfig.effects, ...queue];
      userLength += sharedConfig.effects.length;
      delete sharedConfig.effects;
    }
    for (i = 0; i < userLength; i++)
      runTop(queue[i]);
  }
  function lookUpstream(node, ignore) {
    const runningTransition = Transition && Transition.running;
    if (runningTransition)
      node.tState = 0;
    else
      node.state = 0;
    for (let i = 0; i < node.sources.length; i += 1) {
      const source = node.sources[i];
      if (source.sources) {
        const state = runningTransition ? source.tState : source.state;
        if (state === STALE) {
          if (source !== ignore && (!source.updatedAt || source.updatedAt < ExecCount))
            runTop(source);
        } else if (state === PENDING)
          lookUpstream(source, ignore);
      }
    }
  }
  function markDownstream(node) {
    const runningTransition = Transition && Transition.running;
    for (let i = 0; i < node.observers.length; i += 1) {
      const o = node.observers[i];
      if (runningTransition ? !o.tState : !o.state) {
        if (runningTransition)
          o.tState = PENDING;
        else
          o.state = PENDING;
        if (o.pure)
          Updates.push(o);
        else
          Effects.push(o);
        o.observers && markDownstream(o);
      }
    }
  }
  function cleanNode(node) {
    let i;
    if (node.sources) {
      while (node.sources.length) {
        const source = node.sources.pop(), index = node.sourceSlots.pop(), obs = source.observers;
        if (obs && obs.length) {
          const n = obs.pop(), s = source.observerSlots.pop();
          if (index < obs.length) {
            n.sourceSlots[s] = index;
            obs[index] = n;
            source.observerSlots[index] = s;
          }
        }
      }
    }
    if (node.tOwned) {
      for (i = node.tOwned.length - 1; i >= 0; i--)
        cleanNode(node.tOwned[i]);
      delete node.tOwned;
    }
    if (Transition && Transition.running && node.pure) {
      reset(node, true);
    } else if (node.owned) {
      for (i = node.owned.length - 1; i >= 0; i--)
        cleanNode(node.owned[i]);
      node.owned = null;
    }
    if (node.cleanups) {
      for (i = node.cleanups.length - 1; i >= 0; i--)
        node.cleanups[i]();
      node.cleanups = null;
    }
    if (Transition && Transition.running)
      node.tState = 0;
    else
      node.state = 0;
  }
  function reset(node, top) {
    if (!top) {
      node.tState = 0;
      Transition.disposed.add(node);
    }
    if (node.owned) {
      for (let i = 0; i < node.owned.length; i++)
        reset(node.owned[i]);
    }
  }
  function castError(err) {
    if (err instanceof Error)
      return err;
    return new Error(typeof err === "string" ? err : "Unknown error", {
      cause: err
    });
  }
  function runErrors(err, fns, owner) {
    try {
      for (const f of fns)
        f(err);
    } catch (e) {
      handleError(e, owner && owner.owner || null);
    }
  }
  function handleError(err, owner = Owner) {
    const fns = ERROR && owner && owner.context && owner.context[ERROR];
    const error = castError(err);
    if (!fns)
      throw error;
    if (Effects)
      Effects.push({
        fn() {
          runErrors(error, fns, owner);
        },
        state: STALE
      });
    else
      runErrors(error, fns, owner);
  }
  var hydrationEnabled = false;
  function createComponent(Comp, props) {
    if (hydrationEnabled) {
      if (sharedConfig.context) {
        const c = sharedConfig.context;
        setHydrateContext(nextHydrateContext());
        const r = untrack(() => Comp(props || {}));
        setHydrateContext(c);
        return r;
      }
    }
    return untrack(() => Comp(props || {}));
  }
  function trueFn() {
    return true;
  }
  var propTraps = {
    get(_, property, receiver) {
      if (property === $PROXY)
        return receiver;
      return _.get(property);
    },
    has(_, property) {
      if (property === $PROXY)
        return true;
      return _.has(property);
    },
    set: trueFn,
    deleteProperty: trueFn,
    getOwnPropertyDescriptor(_, property) {
      return {
        configurable: true,
        enumerable: true,
        get() {
          return _.get(property);
        },
        set: trueFn,
        deleteProperty: trueFn
      };
    },
    ownKeys(_) {
      return _.keys();
    }
  };
  function resolveSource(s) {
    return !(s = typeof s === "function" ? s() : s) ? {} : s;
  }
  function resolveSources() {
    for (let i = 0, length = this.length; i < length; ++i) {
      const v = this[i]();
      if (v !== void 0)
        return v;
    }
  }
  function mergeProps(...sources) {
    let proxy = false;
    for (let i = 0; i < sources.length; i++) {
      const s = sources[i];
      proxy = proxy || !!s && $PROXY in s;
      sources[i] = typeof s === "function" ? (proxy = true, createMemo(s)) : s;
    }
    if (SUPPORTS_PROXY && proxy) {
      return new Proxy({
        get(property) {
          for (let i = sources.length - 1; i >= 0; i--) {
            const v = resolveSource(sources[i])[property];
            if (v !== void 0)
              return v;
          }
        },
        has(property) {
          for (let i = sources.length - 1; i >= 0; i--) {
            if (property in resolveSource(sources[i]))
              return true;
          }
          return false;
        },
        keys() {
          const keys = [];
          for (let i = 0; i < sources.length; i++)
            keys.push(...Object.keys(resolveSource(sources[i])));
          return [...new Set(keys)];
        }
      }, propTraps);
    }
    const sourcesMap = {};
    const defined = /* @__PURE__ */ Object.create(null);
    const _loop_2 = (i) => {
      const source = sources[i];
      if (!source)
        return { type: "continue", mutations: { i } };
      const sourceKeys = Object.getOwnPropertyNames(source);
      const _loop_1 = (_i) => {
        const key = sourceKeys[_i];
        if (key === "__proto__" || key === "constructor")
          return "continue";
        const desc = Object.getOwnPropertyDescriptor(source, key);
        if (!defined[key]) {
          defined[key] = desc.get ? {
            enumerable: true,
            configurable: true,
            get: resolveSources.bind(sourcesMap[key] = [desc.get.bind(source)])
          } : desc.value !== void 0 ? desc : void 0;
        } else {
          const sources2 = sourcesMap[key];
          if (sources2) {
            if (desc.get)
              sources2.push(desc.get.bind(source));
            else if (desc.value !== void 0)
              sources2.push(() => desc.value);
          }
        }
      };
      for (let i2 = sourceKeys.length - 1; i2 >= 0; i2--) {
        _loop_1(i2);
      }
      return { mutations: { i } };
    };
    for (let i = sources.length - 1; i >= 0; i--) {
      const _loopResult_1 = _loop_2(i);
      if (typeof _loopResult_1 === "object" && _loopResult_1.type === "continue") {
        i = _loopResult_1.mutations.i;
      }
      if (typeof _loopResult_1 === "object" && _loopResult_1.mutations) {
        i = _loopResult_1.mutations.i;
      }
    }
    const target = {};
    const definedKeys = Object.keys(defined);
    for (let i = definedKeys.length - 1; i >= 0; i--) {
      const key = definedKeys[i], desc = defined[key];
      if (desc && desc.get)
        Object.defineProperty(target, key, desc);
      else
        target[key] = desc ? desc.value : void 0;
    }
    return target;
  }
  var Errors;
  function ErrorBoundary(props) {
    let err;
    if (sharedConfig.context && sharedConfig.load)
      err = sharedConfig.load(sharedConfig.getContextId());
    const _ref1 = createSignal(err, void 0), errored = _ref1[0], setErrored = _ref1[1];
    Errors || (Errors = /* @__PURE__ */ new Set());
    Errors.add(setErrored);
    onCleanup(() => Errors.delete(setErrored));
    return createMemo(() => {
      let e;
      if (e = errored()) {
        const f = props.fallback;
        return typeof f === "function" && f.length ? untrack(() => f(e, () => setErrored())) : f;
      }
      return catchError(() => props.children, setErrored);
    }, void 0, void 0);
  }
  var DEV = void 0;

  // node_modules/solid-js/universal/dist/universal.js
  var memo = (fn) => createMemo(() => fn());
  function createRenderer$1({ createElement: createElement2, createTextNode: createTextNode2, isTextNode, replaceText, insertNode: insertNode2, removeNode, setProperty, getParentNode, getFirstChild, getNextSibling }) {
    function insert2(parent, accessor, marker, initial) {
      if (marker !== void 0 && !initial)
        initial = [];
      if (typeof accessor !== "function")
        return insertExpression(parent, accessor, initial, marker);
      createRenderEffect((current) => insertExpression(parent, accessor(), current, marker), initial);
    }
    function insertExpression(parent, value, current, marker, unwrapArray) {
      while (typeof current === "function")
        current = current();
      if (value === current)
        return current;
      const t = typeof value, multi = marker !== void 0;
      if (t === "string" || t === "number") {
        if (t === "number")
          value = value.toString();
        if (multi) {
          let node = current[0];
          if (node && isTextNode(node)) {
            replaceText(node, value);
          } else
            node = createTextNode2(value);
          current = cleanChildren(parent, current, marker, node);
        } else {
          if (current !== "" && typeof current === "string") {
            replaceText(getFirstChild(parent), current = value);
          } else {
            cleanChildren(parent, current, marker, createTextNode2(value));
            current = value;
          }
        }
      } else if (value == null || t === "boolean") {
        current = cleanChildren(parent, current, marker);
      } else if (t === "function") {
        createRenderEffect(() => {
          let v = value();
          while (typeof v === "function")
            v = v();
          current = insertExpression(parent, v, current, marker);
        });
        return () => current;
      } else if (Array.isArray(value)) {
        const array = [];
        if (normalizeIncomingArray(array, value, unwrapArray)) {
          createRenderEffect(() => current = insertExpression(parent, array, current, marker, true));
          return () => current;
        }
        if (array.length === 0) {
          const replacement = cleanChildren(parent, current, marker);
          if (multi)
            return current = replacement;
        } else {
          if (Array.isArray(current)) {
            if (current.length === 0) {
              appendNodes(parent, array, marker);
            } else
              reconcileArrays(parent, current, array);
          } else if (current == null || !getFirstChild(parent)) {
            appendNodes(parent, array);
          } else {
            reconcileArrays(parent, multi && current || [getFirstChild(parent)], array);
          }
        }
        current = array;
      } else {
        if (Array.isArray(current)) {
          if (multi)
            return current = cleanChildren(parent, current, marker, value);
          cleanChildren(parent, current, null, value);
        } else if (current == null || !getFirstChild(parent)) {
          insertNode2(parent, value);
        } else
          replaceNode(parent, value, getFirstChild(parent));
        current = value;
      }
      return current;
    }
    function normalizeIncomingArray(normalized, array, unwrap) {
      let dynamic = false;
      for (let i = 0, len = array.length; i < len; i++) {
        let item = array[i], t;
        if (item == null || item === true || item === false)
          ;
        else if (Array.isArray(item)) {
          dynamic = normalizeIncomingArray(normalized, item) || dynamic;
        } else if ((t = typeof item) === "string" || t === "number") {
          normalized.push(createTextNode2(item));
        } else if (t === "function") {
          if (unwrap) {
            while (typeof item === "function")
              item = item();
            dynamic = normalizeIncomingArray(normalized, Array.isArray(item) ? item : [item]) || dynamic;
          } else {
            normalized.push(item);
            dynamic = true;
          }
        } else
          normalized.push(item);
      }
      return dynamic;
    }
    function reconcileArrays(parentNode, a, b) {
      let bLength = b.length, aEnd = a.length, bEnd = bLength, aStart = 0, bStart = 0, after = getNextSibling(a[aEnd - 1]), map = null;
      while (aStart < aEnd || bStart < bEnd) {
        if (a[aStart] === b[bStart]) {
          aStart++;
          bStart++;
          continue;
        }
        while (a[aEnd - 1] === b[bEnd - 1]) {
          aEnd--;
          bEnd--;
        }
        if (aEnd === aStart) {
          const node = bEnd < bLength ? bStart ? getNextSibling(b[bStart - 1]) : b[bEnd - bStart] : after;
          while (bStart < bEnd)
            insertNode2(parentNode, b[bStart++], node);
        } else if (bEnd === bStart) {
          while (aStart < aEnd) {
            if (!map || !map.has(a[aStart]))
              removeNode(parentNode, a[aStart]);
            aStart++;
          }
        } else if (a[aStart] === b[bEnd - 1] && b[bStart] === a[aEnd - 1]) {
          const node = getNextSibling(a[--aEnd]);
          insertNode2(parentNode, b[bStart++], getNextSibling(a[aStart++]));
          insertNode2(parentNode, b[--bEnd], node);
          a[aEnd] = b[bEnd];
        } else {
          if (!map) {
            map = /* @__PURE__ */ new Map();
            let i = bStart;
            while (i < bEnd)
              map.set(b[i], i++);
          }
          const index = map.get(a[aStart]);
          if (index != null) {
            if (bStart < index && index < bEnd) {
              let i = aStart, sequence = 1, t;
              while (++i < aEnd && i < bEnd) {
                if ((t = map.get(a[i])) == null || t !== index + sequence)
                  break;
                sequence++;
              }
              if (sequence > index - bStart) {
                const node = a[aStart];
                while (bStart < index)
                  insertNode2(parentNode, b[bStart++], node);
              } else
                replaceNode(parentNode, b[bStart++], a[aStart++]);
            } else
              aStart++;
          } else
            removeNode(parentNode, a[aStart++]);
        }
      }
    }
    function cleanChildren(parent, current, marker, replacement) {
      if (marker === void 0) {
        let removed;
        while (removed = getFirstChild(parent))
          removeNode(parent, removed);
        replacement && insertNode2(parent, replacement);
        return "";
      }
      const node = replacement || createTextNode2("");
      if (current.length) {
        let inserted = false;
        for (let i = current.length - 1; i >= 0; i--) {
          const el = current[i];
          if (node !== el) {
            const isParent = getParentNode(el) === parent;
            if (!inserted && !i)
              isParent ? replaceNode(parent, node, el) : insertNode2(parent, node, marker);
            else
              isParent && removeNode(parent, el);
          } else
            inserted = true;
        }
      } else
        insertNode2(parent, node, marker);
      return [node];
    }
    function appendNodes(parent, array, marker) {
      for (let i = 0, len = array.length; i < len; i++)
        insertNode2(parent, array[i], marker);
    }
    function replaceNode(parent, newNode, oldNode) {
      insertNode2(parent, newNode, oldNode);
      removeNode(parent, oldNode);
    }
    function spreadExpression(node, props, prevProps = {}, skipChildren) {
      props || (props = {});
      if (!skipChildren) {
        createRenderEffect(() => prevProps.children = insertExpression(node, props.children, prevProps.children));
      }
      createRenderEffect(() => props.ref && props.ref(node));
      createRenderEffect(() => {
        const propNames = /* @__PURE__ */ new Set();
        for (const prop in props)
          propNames.add(prop);
        for (const prop in prevProps) {
          if (prop === "children" || prop === "ref" || propNames.has(prop))
            continue;
          setProperty(node, prop, void 0, prevProps[prop]);
          delete prevProps[prop];
        }
        for (const prop of propNames) {
          if (prop === "children" || prop === "ref")
            continue;
          const value = props[prop];
          if (value === prevProps[prop])
            continue;
          setProperty(node, prop, value, prevProps[prop]);
          prevProps[prop] = value;
        }
      });
      return prevProps;
    }
    return {
      render(code, element) {
        let disposer;
        createRoot((dispose) => {
          disposer = dispose;
          insert2(element, code());
        });
        return disposer;
      },
      insert: insert2,
      spread(node, accessor, skipChildren) {
        if (typeof accessor === "function") {
          createRenderEffect((current) => spreadExpression(node, accessor(), current, skipChildren));
        } else
          spreadExpression(node, accessor, void 0, skipChildren);
      },
      createElement: createElement2,
      createTextNode: createTextNode2,
      insertNode: insertNode2,
      setProp(node, name, value, prev) {
        setProperty(node, name, value, prev);
        return value;
      },
      mergeProps,
      effect: createRenderEffect,
      memo,
      createComponent,
      use(fn, element, arg) {
        return untrack(() => fn(element, arg));
      }
    };
  }
  function createRenderer(options) {
    const renderer = createRenderer$1(options);
    renderer.mergeProps = mergeProps;
    return renderer;
  }

  // node_modules/@roku-sdk/solid/src/dom-node.ts
  var defaultProto = {
    _s: domNodeSymbol
  };
  var tagProtoMap = /* @__PURE__ */ new Map();
  var imperativeMethodsRegistry = /* @__PURE__ */ new Map();
  var focusHandler;
  var blurHandler;
  var setPropertyHandler;
  function addImperativeMethods(tag, proto) {
    const methods = imperativeMethodsRegistry.get(tag);
    if (methods) {
      Object.defineProperties(proto, methods);
    }
  }
  function createDomNode(tag, nodeRef) {
    if (!tagProtoMap.has(tag)) {
      const objByTag = Object.create(defaultProto, {
        t: {
          // Not storing interned string ref since this object is never sent to other domain.
          // Hermes does intern all string literals.
          // Do use tagRef if we use js engine that does not support string interning.
          value: tag,
          writable: false,
          enumerable: true,
          configurable: false
        },
        focus: {
          value: function() {
            focusHandler?.(this);
          },
          writable: false,
          enumerable: false,
          configurable: false
        },
        blur: {
          value: function() {
            blurHandler?.(this);
          },
          writable: false,
          enumerable: false,
          configurable: false
        }
      });
      addImperativeMethods(tag, objByTag);
      tagProtoMap.set(tag, objByTag);
    }
    const node = Object.create(tagProtoMap.get(tag), {
      r: {
        value: nodeRef,
        writable: false,
        enumerable: true,
        configurable: false
      },
      parent: {
        value: void 0,
        writable: true,
        enumerable: false,
        configurable: false
      }
    });
    return node;
  }
  function isDomNode(node) {
    return node?._s === domNodeSymbol;
  }
  function setFocusHandler(handler) {
    focusHandler = handler;
  }
  function setBlurHandler(handler) {
    blurHandler = handler;
  }
  function setSetPropertyHandler(handler) {
    setPropertyHandler = handler;
  }

  // node_modules/@roku-sdk/solid/src/focus.ts
  var tmApi;
  var focusLogger;
  var NO_ANCHOR;
  var focused;
  var pending;
  var requestCount = 0;
  var restoreAnchor;
  function findOwningAnchor(node) {
    let current = node;
    while (current?.parent) {
      current = current.parent;
    }
    return current && current.t === void 0 ? current : void 0;
  }
  function initFocus(api, log, noAnchor) {
    tmApi = api;
    focusLogger = log;
    NO_ANCHOR = noAnchor;
  }
  function requestFocus(node) {
    pending = node;
    requestCount++;
  }
  function releaseFocus(node) {
    if (pending === node) {
      pending = void 0;
      requestCount = Math.max(0, requestCount - 1);
    }
    tmApi.setFocus(NO_ANCHOR, node.r, false);
    if (focused === node) {
      restoreAnchor = findOwningAnchor(node);
      focused = void 0;
    }
  }
  function focusNodeRemoved(node, attachParent) {
    if (node === focused) {
      restoreAnchor = findOwningAnchor(attachParent);
      focused = void 0;
    }
    if (node === pending) {
      pending = void 0;
      requestCount = Math.max(0, requestCount - 1);
    }
  }
  function forgetAnchor(anchor) {
    if (restoreAnchor === anchor) {
      restoreAnchor = void 0;
    }
    if (focused && findOwningAnchor(focused) === anchor) {
      focused = void 0;
    }
    if (pending && findOwningAnchor(pending) === anchor) {
      pending = void 0;
      requestCount = Math.max(0, requestCount - 1);
    }
  }
  function commitFocus() {
    if (requestCount > 1) {
      const count = requestCount;
      focusLogger.warn(() => `Multiple nodes (${count}) requested focus in one transaction. Only last one will receive focus.`);
    }
    const node = pending;
    const anchor = restoreAnchor;
    pending = void 0;
    restoreAnchor = void 0;
    requestCount = 0;
    if (node) {
      tmApi.setFocus(NO_ANCHOR, node.r, true);
      focused = node;
      focusLogger.trace(() => `setFocus: ${node.t}`);
    } else if (anchor?.canReceiveFocus) {
      tmApi.setFocus(NO_ANCHOR, anchor.r, true);
      focusLogger.trace(() => `setFocus re-anchored to anchor node`);
    }
  }

  // node_modules/@roku-sdk/solid/src/solid.ts
  var solidLogger = logger.getLogger("fwk");
  var setPropertyObservers = [];
  var notifySetPropertyObservers = (node, name, value) => {
    if (setPropertyObservers.length === 0)
      return;
    for (const observer of setPropertyObservers) {
      try {
        observer(node, name, value);
      } catch (error) {
      }
    }
  };
  var tmApi2;
  var createFullArray;
  var createFullObject;
  var sdCommit;
  var observerCallbacks = /* @__PURE__ */ new WeakMap();
  var NO_ANCHOR2 = Object.freeze({});
  var nodesToRemove = /* @__PURE__ */ new Set();
  var pendingAppendParents = /* @__PURE__ */ new Set();
  var pendingAppendChildren = /* @__PURE__ */ new Set();
  var appendsPending = false;
  function nextNativeSibling(children2, start) {
    for (let i = start; i < children2.length; i++) {
      const child = children2[i];
      if (child && !pendingAppendChildren.has(child)) {
        return child;
      }
    }
    return void 0;
  }
  function warnUnorderedAppendOnlyInsert(parent, node, anchor) {
    solidLogger.warn(() => `${parent.t} only appends children: ${node.t} placed before ${anchor.t} may not keep that position in SceneGraph`);
  }
  function insertIntoAppendOnlyParent(parent, node, anchor) {
    const children2 = parent.c = parent.c || [];
    const nodeIdx = children2.indexOf(node);
    if (nodeIdx !== -1) {
      children2.splice(nodeIdx, 1);
    }
    node.parent = parent;
    let anchorIdx = anchor ? children2.indexOf(anchor) : -1;
    if (anchorIdx === -1) {
      anchorIdx = children2.length;
    }
    children2.splice(anchorIdx, 0, node);
    if (nodeIdx === -1 || appendsPending && pendingAppendChildren.has(node)) {
      appendsPending = true;
      pendingAppendChildren.add(node);
      pendingAppendParents.add(parent);
      ;
      return;
    }
    const next = nextNativeSibling(children2, anchorIdx + 1);
    if (next) {
      warnUnorderedAppendOnlyInsert(parent, node, next);
      tmApi2.insertNodeBefore(NO_ANCHOR2, parent.r, node.r, next.r);
    } else {
      tmApi2.appendNode(NO_ANCHOR2, parent.r, node.r);
    }
    ;
  }
  function resetPendingAppends() {
    pendingAppendParents.clear();
    pendingAppendChildren.clear();
    appendsPending = false;
  }
  function flushPendingAppends() {
    pendingAppendParents.forEach((parent) => {
      const children2 = parent.c ?? [];
      for (let i = 0; i < children2.length; i++) {
        const child = children2[i];
        if (!child || child.parent !== parent || !pendingAppendChildren.delete(child)) {
          continue;
        }
        const next = nextNativeSibling(children2, i + 1);
        if (next) {
          warnUnorderedAppendOnlyInsert(parent, child, next);
          tmApi2.insertNodeBefore(NO_ANCHOR2, parent.r, child.r, next.r);
        } else {
          tmApi2.appendNode(NO_ANCHOR2, parent.r, child.r);
        }
      }
    });
    resetPendingAppends();
  }
  function getParent(node) {
    return node.parent;
  }
  var removeNodeRecursively = (node) => {
    const attachParent = node.parent;
    const stack = [node];
    while (stack.length > 0) {
      const currentNode = stack.pop();
      if (!currentNode) {
        continue;
      }
      if (currentNode.c) {
        stack.push(...currentNode.c);
      }
      focusNodeRemoved(currentNode, attachParent);
      if (currentNode.r) {
        observerCallbacks.delete(currentNode.r);
        currentNode.parent = void 0;
      }
    }
  };
  var isEventHandlerCache = /* @__PURE__ */ new Map();
  var eventNameTransformCache = /* @__PURE__ */ new Map();
  function isEventHandler(key) {
    let result = isEventHandlerCache.get(key);
    if (result === void 0) {
      result = key.length > 2 && key.charAt(0) === "o" && key.charAt(1) === "n" && key.charAt(2) >= "A" && key.charAt(2) <= "Z";
      isEventHandlerCache.set(key, result);
    }
    return result;
  }
  function transformEventName(eventName) {
    let transformed = eventNameTransformCache.get(eventName);
    if (transformed === void 0) {
      transformed = eventName.slice(2).charAt(0).toLowerCase() + eventName.slice(3);
      eventNameTransformCache.set(eventName, transformed);
    }
    return transformed;
  }
  var tagAliases = /* @__PURE__ */ new Map();
  var registerTagAlias = (tag, resolve) => {
    tagAliases.set(tag, resolve);
  };
  var tmTransaction = {
    createElement: (tag) => {
      const sgType = tagAliases.size === 0 ? tag : tagAliases.get(tag)?.() ?? tag;
      const tagRef = stringInterner.internString(sgType);
      if (tagRef === void 0) {
        throw new Error(`Tag not interned: ${sgType}`);
      }
      const nodeRef = tmApi2.createNode(NO_ANCHOR2, tagRef);
      const element = createDomNode(sgType, nodeRef);
      ;
      return element;
    },
    setProperty: (node, name, value, prev) => {
      const nodeRef = node.r;
      let eventProp = false;
      if (isEventHandler(name)) {
        name = transformEventName(name);
        eventProp = true;
      }
      const propRef = stringInterner.internString(name);
      if (propRef === void 0) {
        throw new Error(`Property not interned: ${name}`);
      }
      ;
      if (eventProp) {
        if (typeof prev === "function") {
          tmApi2.unregisterFieldHandler(NO_ANCHOR2, node.r, propRef);
        }
        if (typeof value === "function") {
          tmApi2.registerFieldChangeHandler(NO_ANCHOR2, node.r, propRef);
        }
        let callbacks = observerCallbacks.get(nodeRef);
        if (!callbacks) {
          callbacks = /* @__PURE__ */ new WeakMap();
          observerCallbacks.set(nodeRef, callbacks);
        }
        callbacks.set(propRef, value);
        notifySetPropertyObservers(node, name, value);
        return;
      } else {
        switch (typeof value) {
          case "boolean":
            if (name === "gainFocus") {
              if (value) {
                requestFocus(node);
              } else {
                releaseFocus(node);
              }
              break;
            }
            tmApi2.setNodePropBool(NO_ANCHOR2, nodeRef, propRef, value);
            break;
          case "number":
            if (Number.isInteger(value)) {
              tmApi2.setNodePropInt(NO_ANCHOR2, nodeRef, propRef, value);
            } else {
              tmApi2.setNodePropFloat(NO_ANCHOR2, nodeRef, propRef, value);
            }
            break;
          case "string":
            tmApi2.setNodePropString(NO_ANCHOR2, nodeRef, propRef, value);
            break;
          case "object":
            if (value === null) {
              tmApi2.setNodePropNull(NO_ANCHOR2, nodeRef, propRef);
            } else if (Array.isArray(value)) {
              const arrayRef = createFullArray(value);
              tmApi2.setNodePropArray(NO_ANCHOR2, nodeRef, propRef, arrayRef);
            } else if (isDomNode(value)) {
              tmApi2.setNodePropNodeRef(NO_ANCHOR2, nodeRef, propRef, value.r);
            } else {
              const objectRef = createFullObject(value);
              tmApi2.setNodePropObject(NO_ANCHOR2, nodeRef, propRef, objectRef);
            }
            break;
        }
      }
      if (typeof prev === "object" && isDomNode(prev)) {
        nodesToRemove.add(prev);
      }
      notifySetPropertyObservers(node, name, value);
    },
    insertNode: (parent, node, anchor) => {
      if (node === anchor) {
        return;
      }
      if (parent.t === "panelSet") {
        insertIntoAppendOnlyParent(parent, node, anchor);
        nodesToRemove.delete(node);
        return;
      }
      if (parent.c) {
        const nodeIdx = parent.c.indexOf(node);
        if (nodeIdx !== -1) {
          parent.c.splice(nodeIdx, 1);
        }
      }
      node.parent = parent;
      if (anchor && parent.c) {
        const anchorIdx = parent.c.indexOf(anchor);
        if (anchorIdx !== -1) {
          parent.c.splice(anchorIdx, 0, node);
        }
        tmApi2.insertNodeBefore(NO_ANCHOR2, parent.r, node.r, anchor.r);
        ;
      } else {
        parent.c = parent.c || [];
        parent.c.push(node);
        tmApi2.appendNode(NO_ANCHOR2, parent.r, node.r);
        ;
      }
      if (nodesToRemove.has(node)) {
        nodesToRemove.delete(node);
      }
    },
    removeNode: (parent, child) => {
      if (parent.c) {
        const childIdx = parent.c.indexOf(child);
        if (childIdx !== -1) {
          parent.c.splice(childIdx, 1);
        }
      }
      nodesToRemove.add(child);
    },
    // Note: Precomit is used to remove nodes & set focus.
    // Node removal is done later as solid.js can remove & attach nodes in the same transaction.
    // Focus is set at the end of the transaction as focus changes are lost of setFocus is called in middle of the transaction.
    preCommit: () => {
      nodesToRemove.forEach((node) => {
        const parent = getParent(node);
        if (parent && !(appendsPending && parent.t === "panelSet" && pendingAppendChildren.has(node))) {
          tmApi2.removeNode(NO_ANCHOR2, parent.r, node.r);
          ;
        }
        removeNodeRecursively(node);
      });
      if (appendsPending) {
        flushPendingAppends();
      }
      commitFocus();
      nodesToRemove.clear();
      sdCommit();
    }
  };
  registerPreCommitHook(tmTransaction.preCommit);
  setSetPropertyHandler((node, name, value) => {
    transactionManager.startTransaction();
    tmTransaction.setProperty(node, name, value);
  });
  setFocusHandler((focusNode) => {
    transactionManager.startTransaction();
    requestFocus(focusNode);
  });
  setBlurHandler((blurNode) => {
    transactionManager.startTransaction();
    releaseFocus(blurNode);
    ;
  });
  function createSolidRenderer() {
    return createRenderer({
      createElement(tag) {
        transactionManager.startTransaction();
        return tmTransaction.createElement(tag);
      },
      createTextNode(value) {
        if (value !== "") {
          solidLogger.warn(() => `Text content "${value}" is not rendered on Roku SceneGraph. Use <label> for text display.`);
        }
        transactionManager.startTransaction();
        return tmTransaction.createElement("group");
      },
      replaceText(textNode, value) {
        ;
        return;
      },
      isTextNode(node) {
        ;
        return false;
      },
      setProperty(node, name, value, prev) {
        transactionManager.startTransaction();
        tmTransaction.setProperty(node, name, value, prev);
      },
      insertNode(parent, node, anchor) {
        transactionManager.startTransaction();
        tmTransaction.insertNode(parent, node, anchor);
      },
      removeNode(parent, child) {
        transactionManager.startTransaction();
        tmTransaction.removeNode(parent, child);
      },
      getParentNode(node) {
        return getParent(node);
      },
      getFirstChild(node) {
        return node?.c?.[0] ?? void 0;
      },
      getNextSibling(node) {
        const parent = getParent(node);
        if (parent && parent.c) {
          return parent.c[parent.c.indexOf(node) + 1] ?? void 0;
        }
        return void 0;
      }
    });
  }
  function destroySolidRenderer() {
  }
  function makeRendererFactory(type, api, incomingSDApi, outgoingSDApi) {
    tmApi2 = api;
    initFocus(api, solidLogger, NO_ANCHOR2);
    ({
      createFullArray,
      createFullObject,
      commit: sdCommit
    } = createSDHelper(outgoingSDApi));
    const fieldChangeHandler = /* @__PURE__ */ (() => {
      const invokeCallback = (_anRef, nodeRef, fieldRef, value) => {
        const callbacks = observerCallbacks.get(nodeRef);
        if (callbacks) {
          const callback = callbacks.get(fieldRef);
          if (callback && typeof callback === "function") {
            callback(value);
          }
        }
      };
      return {
        onNodeNullFieldChange: (anRef, nodeRef, fieldRef) => {
          invokeCallback(anRef, nodeRef, fieldRef, null);
        },
        onNodeBoolFieldChange: (anRef, nodeRef, fieldRef, value) => {
          invokeCallback(anRef, nodeRef, fieldRef, value);
        },
        onNodeIntFieldChange: (anRef, nodeRef, fieldRef, value) => {
          invokeCallback(anRef, nodeRef, fieldRef, value);
        },
        onNodeFloatFieldChange: (anRef, nodeRef, fieldRef, value) => {
          invokeCallback(anRef, nodeRef, fieldRef, value);
        },
        onNodeStringFieldChange: (anRef, nodeRef, fieldRef, value) => {
          invokeCallback(anRef, nodeRef, fieldRef, value);
        },
        onNodeObjectFieldChange: (anRef, nodeRef, fieldRef, valueRef) => {
          const data = incomingSDApi.getObject(valueRef);
          if (!data) {
            solidLogger.error(() => `Failed to get object from ref`);
            return;
          }
          invokeCallback(anRef, nodeRef, fieldRef, data);
        },
        onNodeArrayFieldChange: (anRef, nodeRef, fieldRef, valueRef) => {
          const data = incomingSDApi.getArray(valueRef);
          if (!data) {
            solidLogger.error(() => `Failed to get array from ref`);
            return;
          }
          invokeCallback(anRef, nodeRef, fieldRef, data);
        }
      };
    })();
    return {
      createRenderer: createSolidRenderer,
      destroyRenderer: destroySolidRenderer,
      tmFieldChangeHandlerApi: fieldChangeHandler
    };
  }
  function throwUninitializedRendererHook(hookName) {
    throw new Error(`@roku-sdk/solid internal hook "${hookName}" was called before renderer initialization. Ensure makeSolidRenderer() runs via @roku-sdk/rsg-ts setUp() before rendering JSX.`);
  }
  function uninitializedHook(name) {
    return () => throwUninitializedRendererHook(name);
  }
  var effect;
  var memo2;
  var createComponent2;
  var createElement;
  var createTextNode;
  var insertNode;
  var insert;
  var spread;
  var setProp;
  var use;
  effect = uninitializedHook("effect");
  memo2 = uninitializedHook("memo");
  createComponent2 = uninitializedHook("createComponent");
  createElement = uninitializedHook("createElement");
  createTextNode = uninitializedHook("createTextNode");
  insertNode = uninitializedHook("insertNode");
  insert = uninitializedHook("insert");
  spread = uninitializedHook("spread");
  setProp = uninitializedHook("setProp");
  use = uninitializedHook("use");
  function makeSolidRenderer(api, incomingSDApi, outgoingSDApi) {
    const { createRenderer: createRenderer2, destroyRenderer, tmFieldChangeHandlerApi } = makeRendererFactory("solid", api, incomingSDApi, outgoingSDApi);
    const renderer = createRenderer2();
    ({
      effect,
      memo: memo2,
      createComponent: createComponent2,
      createElement,
      createTextNode,
      insertNode,
      insert,
      spread,
      setProp,
      use
    } = renderer);
    const originalSpread = spread;
    spread = (node, accessor, skipChildren) => {
      const createReorderedProxy = (propsObj) => {
        const keys = Object.keys(propsObj);
        if (keys.length <= 1) {
          return propsObj;
        }
        const eventHandlers = [];
        const regularProps = [];
        let needsReorder = false;
        let seenRegularProp = false;
        for (let i = 0; i < keys.length; i++) {
          const key = keys[i];
          if (key === void 0) {
            continue;
          }
          if (isEventHandler(key)) {
            if (seenRegularProp) {
              needsReorder = true;
            }
            eventHandlers.push(key);
          } else {
            seenRegularProp = true;
            regularProps.push(key);
          }
        }
        if (eventHandlers.length === 0 || regularProps.length === 0) {
          return propsObj;
        }
        if (!needsReorder) {
          return propsObj;
        }
        const orderedKeys = [...eventHandlers, ...regularProps];
        return new Proxy(propsObj, {
          ownKeys: () => orderedKeys,
          get: (target, prop) => target[prop],
          getOwnPropertyDescriptor: (target, prop) => {
            if (orderedKeys.includes(prop)) {
              return Object.getOwnPropertyDescriptor(target, prop);
            }
            return void 0;
          }
        });
      };
      if (typeof accessor === "function") {
        const wrappedAccessor = () => {
          const props = accessor();
          if (props && typeof props === "object" && !Array.isArray(props)) {
            return createReorderedProxy(props);
          }
          return props;
        };
        originalSpread(node, wrappedAccessor, skipChildren);
      } else {
        if (accessor && typeof accessor === "object" && !Array.isArray(accessor)) {
          const reordered = createReorderedProxy(accessor);
          originalSpread(node, reordered, skipChildren);
        } else {
          originalSpread(node, accessor, skipChildren);
        }
      }
    };
    renderer.spread = spread;
    return {
      renderer,
      tmFieldChangeHandlerApi
    };
  }

  // node_modules/@roku-sdk/compat/src/tween/index.ts
  registerTagAlias("tween", () => hasFeature("tween") ? "tween" : "RsgTweenShim");

  // node_modules/@roku-sdk/ts-core/src/bootstrap.tsx
  var bootstrapLogger = logger.getLogger("btstp");
  var disposeMap = /* @__PURE__ */ new Map();
  var tsComponentConstructors = /* @__PURE__ */ new Map();
  var tsComponentUpdateInputs = /* @__PURE__ */ new Map();
  var tsComponentUpdateOutputs = /* @__PURE__ */ new Map();
  var focusCapableComponents = /* @__PURE__ */ new Set();
  function canComponentReceiveFocus(name) {
    return focusCapableComponents.has(name);
  }
  var declareApi = void 0;
  function declareTsComponent(declaration, Component) {
    if (!declareApi) {
      throw new Error("Declare API is not set. Make sure setUp is called first");
    }
    const componentNameRef = stringInterner.internString(declaration.componentName);
    const base2 = declaration.extends === "FocusBoundaryBase" && !hasFeature("focusBoundaryBase") ? "FocusBoundaryBaseShim" : declaration.extends;
    const extendsRef = stringInterner.internString(base2);
    if (declaration.libraryName) {
      const libraryNameRef = stringInterner.internString(declaration.libraryName);
      declareApi.declareComponent(componentNameRef, extendsRef, libraryNameRef);
    } else {
      declareApi.declareComponent(componentNameRef, extendsRef);
    }
    if (base2 === "FocusBoundaryBase" || base2 === "FocusBoundaryBaseShim") {
      focusCapableComponents.add(declaration.componentName);
    }
    const declareFields = (fields, output) => {
      Object.keys(fields).forEach((key) => {
        const fieldRef = stringInterner.internString(key);
        const defaultValueFn = fields[key];
        if (defaultValueFn === void 0) {
          return;
        }
        const defaultValue = defaultValueFn();
        switch (typeof defaultValue) {
          case "string":
            declareApi.addStringField(componentNameRef, fieldRef, true, output);
            break;
          case "number":
            if (defaultValueFn.isFloat) {
              declareApi.addFloatField(componentNameRef, fieldRef, true, output);
            } else {
              declareApi.addIntField(componentNameRef, fieldRef, true, output);
            }
            break;
          case "boolean":
            declareApi.addBooleanField(componentNameRef, fieldRef, true, output);
            break;
          case "object":
            if (Array.isArray(defaultValue)) {
              declareApi.addArrayField(componentNameRef, fieldRef, true, output);
            } else {
              declareApi.addObjectField(componentNameRef, fieldRef, true, output);
            }
            break;
          default:
            throw new Error("Unsupported field type");
        }
      });
    };
    declareFields(declaration.inputFields, false);
    declareFields(declaration.outputFields, true);
    function constructComponent(anchorNode) {
      const { renderer } = solidRenderer;
      const { render } = renderer;
      const inputs = {};
      const signals = {};
      const inputFields = declaration.inputFields;
      for (const key in inputFields) {
        const defaultValueFn = inputFields[key];
        if (defaultValueFn === void 0) {
          continue;
        }
        const defaultValue = defaultValueFn();
        const signal = createSignal(defaultValue);
        signals[key] = signal;
        Object.defineProperty(inputs, key, {
          get: signal[0],
          enumerable: true,
          configurable: true
        });
      }
      const outputFields = {};
      for (const key in declaration.outputFields) {
        outputFields[key] = () => {
        };
      }
      const updateInputs2 = (inputFieldName, value) => {
        const fieldName = stringInterner.getStringByInternedRef(inputFieldName);
        ;
        if (fieldName) {
          if (signals[fieldName]) {
            const [, setSignal] = signals[fieldName];
            setSignal((prev) => value);
          }
        }
      };
      const updateOutputs2 = (outputFieldName, handler) => {
        const fieldName = stringInterner.getStringByInternedRef(outputFieldName);
        if (fieldName) {
          if (outputFields[fieldName]) {
            outputFields[fieldName] = handler;
          }
        }
      };
      tsComponentUpdateInputs.set(anchorNode.r, updateInputs2);
      tsComponentUpdateOutputs.set(anchorNode.r, updateOutputs2);
      const { registerAnchorNodeEventListener } = anchorNodeManipulationApi;
      for (const key in declaration.outputFields) {
        registerAnchorNodeEventListener(anchorNode.r, stringInterner.internString(key));
      }
      const dispose = render(() => {
        if (DEV) {
          const owner = getOwner();
          if (owner) {
            owner.name = declaration.componentName;
          }
        }
        return createComponent2(ErrorBoundary, {
          fallback: (err) => {
            bootstrapLogger.error(() => ["Error in TS component: ", err.message, "\n", String(err.stack ?? "")].join(""));
            return null;
          },
          get children() {
            return untrack(() => Component(inputs, outputFields));
          }
        });
      }, anchorNode);
      disposeMap.set(anchorNode.r, dispose);
      ;
      return () => {
        const { unregisterAnchorNodeEventListener } = anchorNodeManipulationApi;
        for (const key in declaration.outputFields) {
          unregisterAnchorNodeEventListener(anchorNode.r, stringInterner.internString(key));
        }
        const dispose2 = disposeMap.get(anchorNode.r);
        ;
        if (dispose2) {
          dispose2();
        }
        disposeMap.delete(anchorNode.r);
        tsComponentUpdateInputs.delete(anchorNode.r);
        tsComponentUpdateOutputs.delete(anchorNode.r);
      };
    }
    tsComponentConstructors.set(declaration.componentName, constructComponent);
  }
  function defineAnchorNode(description, component) {
    return [description, component];
  }
  var registerAnchorNode = ([declaration, Component]) => declareTsComponent(declaration, Component);
  function constructor(anchorNode) {
    ;
    if (!solidRenderer) {
      throw new Error("Solid renderer is not created. Make sure setUp is called first");
    }
    const name = stringInterner.getStringByInternedRef(anchorNode.n);
    if (!name) {
      throw new Error("Failed to get name");
    }
    const constructComponent = tsComponentConstructors.get(name);
    if (!constructComponent) {
      throw new Error("Failed to get constructor");
    }
    return constructComponent(anchorNode);
  }
  function updateInputs(anchorNode, inputFieldName, value) {
    ;
    const updateInputs2 = tsComponentUpdateInputs.get(anchorNode.r);
    if (!updateInputs2) {
      throw new Error("Failed to get update props");
    }
    updateInputs2(inputFieldName, value);
  }
  function updateOutputs(anchorNode, outputFieldName, outputHandler) {
    ;
    const updateOutputs2 = tsComponentUpdateOutputs.get(anchorNode.r);
    if (!updateOutputs2) {
      throw new Error("Failed to get update outputs");
    }
    updateOutputs2(outputFieldName, outputHandler);
  }
  var solidRenderer;
  var anchorNodeManipulationApi;
  function setUp({ declareApi: incomingDeclareApi, tmApi: incomingTmApi, anchorNodeApi, internStringApi: internStringApi2, transactionApi: transactionApi2, incomingSDApi, outgoingSDApi }) {
    ;
    registerInternStringApi(internStringApi2);
    declareApi = incomingDeclareApi;
    registerTransactionApi(transactionApi2);
    solidRenderer = makeSolidRenderer(incomingTmApi, incomingSDApi, outgoingSDApi);
    anchorNodeManipulationApi = makeAnchorNodeManager(incomingSDApi, outgoingSDApi, anchorNodeApi);
    roku.Setup.initApiObject({
      anchorNode: anchorNodeManipulationApi,
      structuredData: incomingSDApi,
      treeManipulation: solidRenderer.tmFieldChangeHandlerApi
    });
    ;
  }

  // node_modules/@roku-sdk/ts-core/src/anchor-node.ts
  function makeAnchorNodeManager(incomingSDApi, outgoingSDApi, anchorNodeApi) {
    const { createFullArray: createFullArray2, createFullObject: createFullObject2, commit: sdCommit2 } = createSDHelper(outgoingSDApi);
    const anchorNodes = /* @__PURE__ */ new Map();
    const anchorNodeDestructors = /* @__PURE__ */ new Map();
    function getAnchorNode(nodeRef) {
      const anchorNode = anchorNodes.get(nodeRef);
      if (!anchorNode) {
        throw new Error(`Anchor node not found for ref: ${JSON.stringify(nodeRef)}`);
      }
      return anchorNode;
    }
    function setAnchorNodeProp(nodeRef, fieldName, value) {
      updateInputs(getAnchorNode(nodeRef), fieldName, value);
    }
    const handleOutputFields = (nodeRef, fieldName, eventData) => {
      const eventDataType = typeof eventData;
      transactionManager.startTransaction();
      switch (eventDataType) {
        case "boolean":
          anchorNodeApi.onAnchorNodeBoolPropChange(nodeRef, fieldName, eventData);
          break;
        case "number":
          if (Number.isInteger(eventData)) {
            anchorNodeApi.onAnchorNodeIntPropChange(nodeRef, fieldName, eventData);
          } else {
            anchorNodeApi.onAnchorNodeFloatPropChange(nodeRef, fieldName, eventData);
          }
          break;
        case "string":
          anchorNodeApi.onAnchorNodeStringPropChange(nodeRef, fieldName, eventData);
          break;
        case "object":
          if (eventData === null) {
            anchorNodeApi.onAnchorNodeNullPropChange(nodeRef, fieldName);
          } else if (Array.isArray(eventData)) {
            const arrayRef = createFullArray2(eventData);
            anchorNodeApi.onAnchorNodeArrayPropChange(nodeRef, fieldName, arrayRef);
          } else {
            const objectRef = createFullObject2(eventData);
            anchorNodeApi.onAnchorNodeObjectPropChange(nodeRef, fieldName, objectRef);
          }
          break;
        default:
          logger.error(() => `Unknown event data type ${eventDataType}`);
      }
      sdCommit2();
    };
    return {
      createAnchorNode: (componentName, nodeRef) => {
        const name = stringInterner.getStringByInternedRef(componentName);
        const anchorNode = {
          r: nodeRef,
          n: componentName,
          canReceiveFocus: name ? canComponentReceiveFocus(name) : false
        };
        anchorNodes.set(anchorNode.r, anchorNode);
        const destructor = constructor(anchorNode);
        anchorNodeDestructors.set(anchorNode.r, destructor);
      },
      removeAnchorNode: (nodeRef) => {
        anchorNodeDestructors.get(nodeRef)?.();
        const anchorNode = anchorNodes.get(nodeRef);
        if (anchorNode)
          forgetAnchor(anchorNode);
        anchorNodes.delete(nodeRef);
        anchorNodeDestructors.delete(nodeRef);
      },
      updateAnchorNodePropBool: (nodeRef, fieldName, value) => {
        setAnchorNodeProp(nodeRef, fieldName, value);
      },
      updateAnchorNodePropNull: (nodeRef, fieldName) => {
        setAnchorNodeProp(nodeRef, fieldName, null);
      },
      updateAnchorNodePropInt: (nodeRef, fieldName, value) => {
        setAnchorNodeProp(nodeRef, fieldName, value);
      },
      updateAnchorNodePropFloat: (nodeRef, fieldName, value) => {
        setAnchorNodeProp(nodeRef, fieldName, value);
      },
      updateAnchorNodePropString: (nodeRef, fieldName, value) => {
        setAnchorNodeProp(nodeRef, fieldName, value);
      },
      updateAnchorNodePropObject: (nodeRef, fieldName, ref) => {
        const anchorNode = getAnchorNode(nodeRef);
        const value = incomingSDApi.getObject(ref);
        updateInputs(anchorNode, fieldName, value);
      },
      updateAnchorNodePropArray: (nodeRef, fieldName, ref) => {
        const anchorNode = getAnchorNode(nodeRef);
        const value = incomingSDApi.getArray(ref);
        updateInputs(anchorNode, fieldName, value);
      },
      registerAnchorNodeEventListener: (nodeRef, outputFieldName) => {
        const anchorNode = getAnchorNode(nodeRef);
        const eventHandler = (eventData) => {
          handleOutputFields(nodeRef, outputFieldName, eventData);
        };
        updateOutputs(anchorNode, outputFieldName, eventHandler);
      },
      unregisterAnchorNodeEventListener: (nodeRef, outputFieldName) => {
        const anchorNode = getAnchorNode(nodeRef);
        const eventHandler = () => {
        };
        updateOutputs(anchorNode, outputFieldName, eventHandler);
      },
      removeAllAnchorNodes: () => {
        anchorNodes.forEach((anchorNode, nodeRef) => {
          anchorNodeDestructors.get(nodeRef)?.();
          forgetAnchor(anchorNode);
        });
        anchorNodes.clear();
        anchorNodeDestructors.clear();
      }
    };
  }

  // node_modules/@roku-sdk/ts-core/src/structured-data.ts
  var incomingArrays = /* @__PURE__ */ new Map();
  var incomingObjects = /* @__PURE__ */ new Map();
  var refValue = 0;
  function makeStructuredDataHandler() {
    const appendValue = (arrayRef, value) => {
      const array = incomingArrays.get(arrayRef);
      if (array) {
        array.push(value);
      }
    };
    const insertValue = (objectRef, propName, value) => {
      const array = incomingObjects.get(objectRef);
      if (array) {
        array[propName] = value;
      }
    };
    const notImplemented = () => {
      throw new Error("Not implemented");
    };
    return {
      createArray: () => {
        ++refValue;
        incomingArrays.set(refValue, []);
        return refValue;
      },
      appendArray(arrayRef, value) {
        const valueArray = incomingArrays.get(value);
        appendValue(arrayRef, valueArray);
      },
      appendBool: (arrayRef, value) => appendValue(arrayRef, value),
      appendFloat: (arrayRef, value) => appendValue(arrayRef, value),
      appendInt: (arrayRef, value) => appendValue(arrayRef, value),
      appendNodeRef: (arrayRef, value) => appendValue(arrayRef, value),
      appendNull: (arrayRef) => appendValue(arrayRef, null),
      appendObject(arrayRef, value) {
        const valueObject = incomingObjects.get(value);
        if (!valueObject) {
          throw new Error(`Object ${value} not found`);
        }
        appendValue(arrayRef, valueObject);
      },
      appendString: (arrayRef, value) => appendValue(arrayRef, value),
      createObject() {
        ++refValue;
        incomingObjects.set(refValue, {});
        return refValue;
      },
      insertArray(objectRef, propName, value) {
        const valueArray = incomingArrays.get(value);
        insertValue(objectRef, propName, valueArray);
      },
      insertBool: (objectRef, propName, value) => insertValue(objectRef, propName, value),
      insertFloat: (objectRef, propName, value) => insertValue(objectRef, propName, value),
      insertInt: (objectRef, propName, value) => insertValue(objectRef, propName, value),
      insertNodeRef(objectRef, propName, value) {
        notImplemented();
      },
      insertNull: (objectRef, propName) => insertValue(objectRef, propName, null),
      insertObject(objectRef, propName, value) {
        const valueObject = incomingObjects.get(value);
        if (!valueObject) {
          throw new Error(`Object ${value} not found`);
        }
        insertValue(objectRef, propName, valueObject);
      },
      insertString: (objectRef, propName, value) => insertValue(objectRef, propName, value),
      getArray: (arrayRef) => {
        const arr = incomingArrays.get(arrayRef);
        incomingArrays.delete(arrayRef);
        return arr;
      },
      getObject: (objectRef) => {
        const obj = incomingObjects.get(objectRef);
        incomingObjects.delete(objectRef);
        return obj;
      }
    };
  }

  // node_modules/@roku-sdk/native/src/fetch-polyfill.ts
  function Request(url, init) {
    return globalThis.RequestHostFunc.call(null, url, init);
  }
  function HttpsAgent2(options) {
    return globalThis.HttpsAgentHostFunc.call(null, options);
  }
  function Headers(init) {
    return globalThis.HeadersHostFunc.call(null, init);
  }
  globalThis.Request = Request;
  globalThis.HttpsAgent = HttpsAgent2;
  globalThis.Headers = Headers;

  // node_modules/@roku-sdk/native/src/process.ts
  function getManifestSourceMapSHA() {
    try {
      const appInfo = roku.getRuntimeSingletonSync("AppInfo");
      if (!appInfo) {
        return "<none>";
      }
      const sha = appInfo.getManifestValue("hbc_source_map_sha");
      return sha || "<none>";
    } catch {
      return "<none>";
    }
  }
  function buildSourceMapTag() {
    const hostSha = getManifestSourceMapSHA();
    const parts = [`index:${hostSha}`];
    const dclShas = globalThis.__DCL_SOURCE_MAP_SHAS;
    if (dclShas) {
      for (const lib in dclShas) {
        parts.push(`${lib}:${dclShas[lib]}`);
      }
    }
    return parts.join(" ");
  }
  function logExceptionWithSHA(error) {
    logger.error(() => error ? error.toString() : "Uncaught exception");
    const sha = getManifestSourceMapSHA();
    logger.error(() => `source_map_sha=${sha}`);
    const dclShas = globalThis.__DCL_SOURCE_MAP_SHAS;
    if (dclShas) {
      const _loop_1 = (lib) => {
        logger.error(() => `source_map_sha=${lib}:${dclShas[lib]}`);
      };
      for (const lib in dclShas) {
        _loop_1(lib);
      }
    }
    return sha;
  }
  function formatCallSite(frame) {
    const fn = frame.getFunctionName();
    const file = frame.getFileName() ?? "<anonymous>";
    const line = frame.getLineNumber() ?? 0;
    const col = frame.getColumnNumber() ?? 0;
    const loc = `${file}:${line}:${col}`;
    if (frame.isConstructor()) {
      return `    at new ${fn ?? "<anonymous>"} (${loc})`;
    }
    return fn ? `    at ${fn} (${loc})` : `    at ${loc}`;
  }
  var exceptionTaggingEnabled = false;
  function enableExceptionTagging() {
    if (exceptionTaggingEnabled)
      return;
    exceptionTaggingEnabled = true;
    let useCustomFormatter = false;
    try {
      const testError = new Error();
      const testStack = [];
      const originalPrepare = Error.prepareStackTrace;
      Error.prepareStackTrace = (_e, stack) => {
        testStack.push(...stack);
        return "";
      };
      const errorWithCapture = Error;
      errorWithCapture.captureStackTrace?.(testError);
      void testError.stack;
      Error.prepareStackTrace = originalPrepare;
      const firstFrame = testStack[0];
      useCustomFormatter = firstFrame !== void 0 && firstFrame.getColumnNumber() !== null;
    } catch {
      useCustomFormatter = false;
    }
    if (useCustomFormatter) {
      Error.prepareStackTrace = (error, stack) => {
        const newline = String.fromCharCode(10);
        const rawStackTrace = stack.map((frame) => formatCallSite(frame)).join(newline);
        const tag = buildSourceMapTag();
        return [error.toString(), newline, rawStackTrace, newline, "    [SourceMap: ", tag, "]", newline].join("");
      };
    } else {
      const originalStackGetter = Object.getOwnPropertyDescriptor(Error.prototype, "stack")?.get;
      if (originalStackGetter) {
        Object.defineProperty(Error.prototype, "stack", {
          get: function() {
            const nativeStack = originalStackGetter.call(this);
            if (typeof nativeStack === "string" && !nativeStack.includes("[SourceMap:")) {
              const tag = buildSourceMapTag();
              return [nativeStack, "\n    [SourceMap: ", tag, "]\n"].join("");
            }
            return nativeStack;
          },
          configurable: true
        });
      }
    }
  }
  var customExceptionHandler = null;
  function setupProcessHandlers(processApi) {
    processApi.setUncaughtExceptionCaptureCallback((error, done) => {
      const sha = logExceptionWithSHA(error);
      if (customExceptionHandler) {
        customExceptionHandler(error, sha, done);
      } else {
        done(true);
      }
    });
    processApi.setUnhandledRejectionCallback((id, error) => {
      logger.error(() => error ? error.toString() : `Unhandled rejection with id: ${id}`);
    });
  }
  if (typeof globalThis.Process !== "undefined") {
    setupProcessHandlers(globalThis.Process);
  }

  // node_modules/@roku-sdk/native/src/index.ts
  if (false) {
    installConsolePolyfill();
  }
  var runtimeSetUp = false;
  function main(declare) {
    if (runtimeSetUp) {
      ;
    } else {
      runtimeSetUp = true;
      setUpRuntime();
    }
    declare();
    roku.ComponentDeclarationApi.commit();
  }
  function setUpRuntime() {
    logger.info(() => "main begins");
    const internStringApi2 = roku.InternStringApi;
    const tmApi3 = roku.TreeManipulationApi;
    const anchorNodeApi = roku.AnchorManipulationEventApi;
    const declareApi2 = roku.ComponentDeclarationApi;
    const transactionApi2 = roku.Transaction;
    if (typeof transactionApi2.setErrorCallback === "function") {
      const txLogger2 = logger.getLogger("tx");
      transactionApi2.setErrorCallback((errorRef, count) => {
        const _loop_1 = (index) => {
          txLogger2.error(() => {
            const reason = transactionApi2.getErrorReason?.(errorRef, index);
            const reasonName = Object.keys(roku.TmErrorReason ?? {}).find((name) => roku.TmErrorReason?.[name] === reason) ?? reason;
            const details = [["operation", transactionApi2.getErrorOperation?.(errorRef, index)], ["nodeId", transactionApi2.getErrorNodeId?.(errorRef, index)], ["propName", transactionApi2.getErrorPropName?.(errorRef, index)]].filter(([, value]) => value !== void 0).map(([key, value]) => `${key}=${value}`);
            return `Transaction error ${reasonName}: ${transactionApi2.getErrorMessage?.(errorRef, index) ?? ""}${details.length ? ` (${details.join(", ")})` : ""}`;
          });
        };
        for (let index = 0; index < count; index++) {
          _loop_1(index);
        }
      });
    }
    const incomingSDApi = makeStructuredDataHandler();
    const outgoingSDApi = roku.StructuredDataApi;
    setUp({
      declareApi: declareApi2,
      tmApi: tmApi3,
      anchorNodeApi,
      internStringApi: internStringApi2,
      transactionApi: transactionApi2,
      incomingSDApi,
      outgoingSDApi
    });
  }

  // src/identity.json
  var identity_default = { kty: "EC", x: "wqSoN6DP8TjTPCLwvG4OymXTEr30izJS0eITfd-sjRA", y: "6RYSL9n1NotbhrCEvgVFyyanc10XyuJ7GZI63rVmbKU", crv: "P-256", d: "Od9ZSpvFFXYjjP5qSJSAW5srjg7TbmxGmarwrBsz0W4" };

  // src/selftest.json
  var selftest_default = { key: "0000000000000000000000000000000000000000000000000000000000000000", iv: "AAAAAAAAAAAAAAAA", payload: "tYUzWCEGHwt0OufpmLnbTFISZrlYylwRo4CIggletBL5D1o5Urnh2MJ6jA", expected: '{"selftest":"JFT resolver"}' };

  // node_modules/@noble/ciphers/utils.js
  function isBytes(a) {
    return a instanceof Uint8Array || ArrayBuffer.isView(a) && a.constructor.name === "Uint8Array" && "BYTES_PER_ELEMENT" in a && a.BYTES_PER_ELEMENT === 1;
  }
  var atitle = (title) => title ? `"${title}" ` : "";
  function abool(value, title = "") {
    if (typeof value !== "boolean")
      throw new TypeError(atitle(title) + "expected boolean, got type=" + typeof value);
    return value;
  }
  function anumber(n, title = "") {
    if (typeof n !== "number")
      throw new TypeError(atitle(title) + "expected number, got " + typeof n);
    if (!Number.isSafeInteger(n) || n < 0)
      throw new RangeError(atitle(title) + "expected integer >= 0, got " + n);
    return n;
  }
  function abytes(value, length, title = "") {
    if (isBytes(value) && (length === void 0 || value.length === length))
      return value;
    if (length !== void 0)
      anumber(length, "length");
    const bytes = isBytes(value);
    const ofLen = length !== void 0 ? ` of length ${length}` : "";
    const got = bytes ? `length=${value.length}` : `type=${typeof value}`;
    const message = atitle(title) + "expected Uint8Array" + ofLen + ", got " + got;
    if (!bytes)
      throw new TypeError(message);
    throw new RangeError(message);
  }
  function aexists(instance, checkFinished = true) {
    if (instance.destroyed)
      throw new Error("hash was destroyed");
    if (checkFinished && instance.finished)
      throw new Error("digest() was already called");
  }
  function aoutput(out, instance) {
    abytes(out, void 0, "output");
    const min = instance.outputLen;
    if (!(out.length >= min)) {
      throw new RangeError('"output" expected length >= ' + min);
    }
  }
  function aoutput32(out, instance) {
    aoutput(out, instance);
    if (!isAligned32(out))
      throw new Error("invalid output, must be aligned");
  }
  function u8(arr) {
    return new Uint8Array(arr.buffer, arr.byteOffset, arr.byteLength);
  }
  function u32(arr) {
    return new Uint32Array(arr.buffer, arr.byteOffset, Math.floor(arr.byteLength / 4));
  }
  function clean(...arrays) {
    for (let i = 0; i < arrays.length; i++) {
      arrays[i].fill(0);
    }
  }
  function createView(arr) {
    return new DataView(arr.buffer, arr.byteOffset, arr.byteLength);
  }
  var isLE = /* @__PURE__ */ (() => new Uint8Array(new Uint32Array([287454020]).buffer)[0] === 68)();
  function byteSwap(word) {
    return word << 24 & 4278190080 | word << 8 & 16711680 | word >>> 8 & 65280 | word >>> 24 & 255;
  }
  var swap8IfBE = isLE ? (n) => n : (n) => byteSwap(n) >>> 0;
  function byteSwap32(arr) {
    for (let i = 0; i < arr.length; i++) {
      arr[i] = byteSwap(arr[i]);
    }
    return arr;
  }
  var swap32IfBE = isLE ? (u) => u : byteSwap32;
  function equalBytes(a, b) {
    a = abytes(a);
    b = abytes(b);
    if (a.length !== b.length)
      return false;
    let diff = 0;
    for (let i = 0; i < a.length; i++)
      diff |= a[i] ^ b[i];
    return diff === 0;
  }
  function wrapMacConstructor(keyLen, macCons, fromMsg) {
    const mac = macCons;
    const getArgs = fromMsg || (() => []);
    const macC = (msg, key) => mac(key, ...getArgs(msg)).update(msg).digest();
    const tmp = mac(new Uint8Array(keyLen), ...getArgs(new Uint8Array(0)));
    macC.outputLen = tmp.outputLen;
    macC.blockLen = tmp.blockLen;
    macC.create = (key, ...args) => mac(key, ...args);
    return macC;
  }
  var wrapCipher = /* @__NO_SIDE_EFFECTS__ */ (params, constructor2) => {
    function wrappedCipher(key, ...args) {
      abytes(key, void 0, "key");
      if (params.nonceLength !== void 0) {
        const nonce = args[0];
        abytes(nonce, params.varSizeNonce ? void 0 : params.nonceLength, "nonce");
      }
      const tagl = params.tagLength;
      const aadStart = params.nonceLength !== void 0 ? 1 : 0;
      if (!params.withAAD) {
        for (let i = aadStart; i < args.length; i++)
          if (isBytes(args[i]))
            throw new Error("AAD not supported");
      }
      if (params.withAAD && args[aadStart] !== void 0)
        abytes(args[aadStart], void 0, "AAD");
      const cipher = constructor2(key, ...args);
      const checkOutput = (fnLength, output) => {
        if (output !== void 0) {
          if (fnLength !== 2)
            throw new Error("cipher output not supported");
          abytes(output, void 0, "output");
        }
      };
      let called = false;
      const wrCipher = {
        encrypt(data, output) {
          if (called)
            throw new Error("cannot encrypt() twice with same key + nonce");
          called = true;
          abytes(data, void 0, "data");
          checkOutput(cipher.encrypt.length, output);
          return cipher.encrypt(data, output);
        },
        decrypt(data, output) {
          abytes(data, void 0, "data");
          if (tagl && data.length < tagl)
            throw new Error('"ciphertext" expected length >= tagLength=' + tagl);
          checkOutput(cipher.decrypt.length, output);
          return cipher.decrypt(data, output);
        }
      };
      return wrCipher;
    }
    Object.assign(wrappedCipher, params);
    return wrappedCipher;
  };
  function getOutput(expectedLength, out, onlyAligned = true) {
    if (out === void 0)
      return new Uint8Array(expectedLength);
    abytes(out, expectedLength, "output");
    if (onlyAligned && !isAligned32(out))
      throw new Error("invalid output, must be aligned");
    return out;
  }
  function u64Lengths(dataLength, aadLength, isLE2) {
    anumber(dataLength);
    anumber(aadLength);
    abool(isLE2);
    const num = new Uint8Array(16);
    const view = createView(num);
    view.setBigUint64(0, BigInt(aadLength), isLE2);
    view.setBigUint64(8, BigInt(dataLength), isLE2);
    return num;
  }
  function isAligned32(bytes) {
    return bytes.byteOffset % 4 === 0;
  }
  function copyBytes(bytes) {
    return Uint8Array.from(abytes(bytes));
  }

  // node_modules/@noble/ciphers/_polyval.js
  function _classCallCheck(a, n) {
    if (!(a instanceof n))
      throw new TypeError("Cannot call a class as a function");
  }
  function _defineProperties(e, r) {
    for (var t = 0; t < r.length; t++) {
      var o = r[t];
      o.enumerable = o.enumerable || false, o.configurable = true, "value" in o && (o.writable = true), Object.defineProperty(e, _toPropertyKey(o.key), o);
    }
  }
  function _createClass(e, r, t) {
    return r && _defineProperties(e.prototype, r), t && _defineProperties(e, t), Object.defineProperty(e, "prototype", { writable: false }), e;
  }
  function _defineProperty(e, r, t) {
    return (r = _toPropertyKey(r)) in e ? Object.defineProperty(e, r, { value: t, enumerable: true, configurable: true, writable: true }) : e[r] = t, e;
  }
  function _toPropertyKey(t) {
    var i = _toPrimitive(t, "string");
    return "symbol" == typeof i ? i : i + "";
  }
  function _toPrimitive(t, e) {
    if ("object" != typeof t || !t)
      return t;
    var r;
    if ("undefined" != typeof Symbol && void 0 !== (r = t[Symbol.toPrimitive])) {
      var i = r.call(t, e || "default");
      if ("object" != typeof i)
        return i;
      throw new TypeError("@@toPrimitive must return a primitive value.");
    }
    return ("string" === e ? String : Number)(t);
  }
  var BLOCK_SIZE = 16;
  var ZEROS16 = /* @__PURE__ */ new Uint8Array(16);
  var ZEROS32 = /* @__PURE__ */ u32(ZEROS16);
  var POLY = 225;
  var mul2 = (s0, s1, s2, s3) => {
    const hiBit = s3 & 1;
    return {
      s3: s2 << 31 | s3 >>> 1,
      s2: s1 << 31 | s2 >>> 1,
      s1: s0 << 31 | s1 >>> 1,
      // NIST SP 800-38D §6.3 applies `V >> 1` and XORs R on carry. In this
      // 4x32-bit split, R = 0xe1 || 0^120 lives in the top byte of s0.
      s0: s0 >>> 1 ^ POLY << 24 & -(hiBit & 1)
      // reduce % poly
    };
  };
  var swapLE = (n) => (n >>> 0 & 255) << 24 | (n >>> 8 & 255) << 16 | (n >>> 16 & 255) << 8 | n >>> 24 & 255 | 0;
  var estimateWindow = (bytes) => {
    if (bytes > 64 * 1024)
      return 8;
    if (bytes > 1024)
      return 4;
    return 2;
  };
  var GHASH = /* @__PURE__ */ (function() {
    function GHASH2(key, expectedLength) {
      _classCallCheck(this, GHASH2);
      _defineProperty(this, "blockLen", BLOCK_SIZE);
      _defineProperty(this, "outputLen", BLOCK_SIZE);
      _defineProperty(this, "s0", 0);
      _defineProperty(this, "s1", 0);
      _defineProperty(this, "s2", 0);
      _defineProperty(this, "s3", 0);
      _defineProperty(this, "finished", false);
      _defineProperty(this, "destroyed", false);
      _defineProperty(this, "t", void 0);
      _defineProperty(this, "W", void 0);
      _defineProperty(this, "windowSize", void 0);
      abytes(key, 16, "key");
      key = copyBytes(key);
      const kView = createView(key);
      let k0 = kView.getUint32(0, false);
      let k1 = kView.getUint32(4, false);
      let k2 = kView.getUint32(8, false);
      let k3 = kView.getUint32(12, false);
      const doubles = [];
      for (let i = 0; i < 128; i++) {
        doubles.push({
          s0: swapLE(k0),
          s1: swapLE(k1),
          s2: swapLE(k2),
          s3: swapLE(k3)
        });
        ({
          s0: k0,
          s1: k1,
          s2: k2,
          s3: k3
        } = mul2(k0, k1, k2, k3));
      }
      const W = estimateWindow(expectedLength || 1024);
      if (![1, 2, 4, 8].includes(W))
        throw new Error("ghash: invalid window size, expected 2, 4 or 8");
      this.W = W;
      const bits = 128;
      const windows = bits / W;
      const windowSize = this.windowSize = 2 ** W;
      const items = [];
      for (let w = 0; w < windows; w++) {
        for (let byte = 0; byte < windowSize; byte++) {
          let s0 = 0, s1 = 0, s2 = 0, s3 = 0;
          for (let j = 0; j < W; j++) {
            const bit = byte >>> W - j - 1 & 1;
            if (!bit)
              continue;
            const { s0: d0, s1: d1, s2: d2, s3: d3 } = doubles[W * w + j];
            s0 ^= d0, s1 ^= d1, s2 ^= d2, s3 ^= d3;
          }
          items.push({
            s0,
            s1,
            s2,
            s3
          });
        }
      }
      this.t = items;
    }
    return _createClass(GHASH2, [{
      key: "_updateBlock",
      value: function _updateBlock(s0, s1, s2, s3) {
        s0 ^= this.s0, s1 ^= this.s1, s2 ^= this.s2, s3 ^= this.s3;
        const { W, t, windowSize } = this;
        let o0 = 0, o1 = 0, o2 = 0, o3 = 0;
        const mask = (1 << W) - 1;
        let w = 0;
        for (const num of [s0, s1, s2, s3]) {
          for (let bytePos = 0; bytePos < 4; bytePos++) {
            const byte = num >>> 8 * bytePos & 255;
            for (let bitPos = 8 / W - 1; bitPos >= 0; bitPos--) {
              const bit = byte >>> W * bitPos & mask;
              const { s0: e0, s1: e1, s2: e2, s3: e3 } = t[w * windowSize + bit];
              o0 ^= e0, o1 ^= e1, o2 ^= e2, o3 ^= e3;
              w += 1;
            }
          }
        }
        this.s0 = o0;
        this.s1 = o1;
        this.s2 = o2;
        this.s3 = o3;
      }
    }, {
      key: "update",
      value: function update(data) {
        aexists(this);
        abytes(data);
        data = copyBytes(data);
        const b32 = u32(data);
        const blocks = Math.floor(data.length / BLOCK_SIZE);
        const left = data.length % BLOCK_SIZE;
        for (let i = 0; i < blocks; i++) {
          this._updateBlock(swap8IfBE(b32[i * 4 + 0]), swap8IfBE(b32[i * 4 + 1]), swap8IfBE(b32[i * 4 + 2]), swap8IfBE(b32[i * 4 + 3]));
        }
        if (left) {
          ZEROS16.set(data.subarray(blocks * BLOCK_SIZE));
          this._updateBlock(swap8IfBE(ZEROS32[0]), swap8IfBE(ZEROS32[1]), swap8IfBE(ZEROS32[2]), swap8IfBE(ZEROS32[3]));
          clean(ZEROS32);
        }
        return this;
      }
    }, {
      key: "destroy",
      value: function destroy() {
        this.destroyed = true;
        const { t } = this;
        for (const elm of t) {
          elm.s0 = 0, elm.s1 = 0, elm.s2 = 0, elm.s3 = 0;
        }
      }
    }, {
      key: "digestInto",
      value: function digestInto(out) {
        aexists(this);
        aoutput32(out, this);
        this.finished = true;
        const { s0, s1, s2, s3 } = this;
        const o32 = u32(out);
        o32[0] = s0;
        o32[1] = s1;
        o32[2] = s2;
        o32[3] = s3;
        if (!isLE)
          swap32IfBE(o32.subarray(0, BLOCK_SIZE / 4));
      }
    }, {
      key: "digest",
      value: function digest2() {
        const res = new Uint8Array(BLOCK_SIZE);
        this.digestInto(res);
        this.destroy();
        return res;
      }
    }]);
  })();
  var ghash = /* @__PURE__ */ wrapMacConstructor(16, (key, expectedLength) => new GHASH(key, expectedLength), (msg) => [msg.length]);

  // node_modules/@noble/ciphers/aes.js
  var BLOCK_SIZE2 = 16;
  var BLOCK_SIZE32 = 4;
  var EMPTY_BLOCK = /* @__PURE__ */ new Uint8Array(BLOCK_SIZE2);
  var POLY2 = 283;
  function validateKeyLength(key) {
    if (![16, 24, 32].includes(key.length))
      throw new Error('"aes key" expected Uint8Array of length 16/24/32, got length=' + key.length);
  }
  function mul22(n) {
    return n << 1 ^ POLY2 & -(n >> 7);
  }
  function mul(a, b) {
    let res = 0;
    for (; b > 0; b >>= 1) {
      res ^= a & -(b & 1);
      a = mul22(a);
    }
    return res;
  }
  var sbox = /* @__PURE__ */ (() => {
    const t = new Uint8Array(256);
    for (let i = 0, x = 1; i < 256; i++, x ^= mul22(x))
      t[i] = x;
    const box = new Uint8Array(256);
    box[0] = 99;
    for (let i = 0; i < 255; i++) {
      let x = t[255 - i];
      x |= x << 8;
      box[t[i]] = (x ^ x >> 4 ^ x >> 5 ^ x >> 6 ^ x >> 7 ^ 99) & 255;
    }
    clean(t);
    return box;
  })();
  var rotr32_8 = (n) => n << 24 | n >>> 8;
  var rotl32_8 = (n) => n << 8 | n >>> 24;
  function genTtable(sbox2, fn) {
    if (sbox2.length !== 256)
      throw new Error("wrong sbox length");
    const T0 = new Uint32Array(256).map((_, j) => fn(sbox2[j]));
    const T1 = T0.map(rotl32_8);
    const T2 = T1.map(rotl32_8);
    const T3 = T2.map(rotl32_8);
    const T01 = new Uint32Array(256 * 256);
    const T23 = new Uint32Array(256 * 256);
    const sbox22 = new Uint16Array(256 * 256);
    for (let i = 0; i < 256; i++) {
      for (let j = 0; j < 256; j++) {
        const idx = i * 256 + j;
        T01[idx] = T0[i] ^ T1[j];
        T23[idx] = T2[i] ^ T3[j];
        sbox22[idx] = sbox2[i] << 8 | sbox2[j];
      }
    }
    return {
      sbox: sbox2,
      sbox2: sbox22,
      T0,
      T1,
      T2,
      T3,
      T01,
      T23
    };
  }
  var tableEncoding = /* @__PURE__ */ genTtable(sbox, (s) => mul(s, 3) << 24 | s << 16 | s << 8 | mul(s, 2));
  var xPowers = /* @__PURE__ */ (() => {
    const p = new Uint8Array(16);
    for (let i = 0, x = 1; i < 16; i++, x = mul22(x))
      p[i] = x;
    return p;
  })();
  function expandKeyLE(key) {
    abytes(key);
    const len = key.length;
    validateKeyLength(key);
    const { sbox2 } = tableEncoding;
    const toClean = [];
    if (!isLE || !isAligned32(key))
      toClean.push(key = copyBytes(key));
    const k32 = swap32IfBE(u32(key));
    const Nk = k32.length;
    const subByte = (n) => applySbox(sbox2, n, n, n, n);
    const xk = new Uint32Array(len + 28);
    xk.set(k32);
    for (let i = Nk; i < xk.length; i++) {
      let t = xk[i - 1];
      if (i % Nk === 0)
        t = subByte(rotr32_8(t)) ^ xPowers[i / Nk - 1];
      else if (Nk > 6 && i % Nk === 4)
        t = subByte(t);
      xk[i] = xk[i - Nk] ^ t;
    }
    clean(...toClean);
    return xk;
  }
  function apply0123(T01, T23, s0, s1, s2, s3) {
    return T01[s0 << 8 & 65280 | s1 >>> 8 & 255] ^ T23[s2 >>> 8 & 65280 | s3 >>> 24 & 255];
  }
  function applySbox(sbox2, s0, s1, s2, s3) {
    return sbox2[s0 & 255 | s1 & 65280] | sbox2[s2 >>> 16 & 255 | s3 >>> 16 & 65280] << 16;
  }
  function encrypt(xk, s0, s1, s2, s3) {
    const { sbox2, T01, T23 } = tableEncoding;
    let k = 0;
    s0 ^= xk[k++], s1 ^= xk[k++], s2 ^= xk[k++], s3 ^= xk[k++];
    const rounds = xk.length / 4 - 2;
    for (let i = 0; i < rounds; i++) {
      const t02 = xk[k++] ^ apply0123(T01, T23, s0, s1, s2, s3);
      const t12 = xk[k++] ^ apply0123(T01, T23, s1, s2, s3, s0);
      const t22 = xk[k++] ^ apply0123(T01, T23, s2, s3, s0, s1);
      const t32 = xk[k++] ^ apply0123(T01, T23, s3, s0, s1, s2);
      s0 = t02, s1 = t12, s2 = t22, s3 = t32;
    }
    const t0 = xk[k++] ^ applySbox(sbox2, s0, s1, s2, s3);
    const t1 = xk[k++] ^ applySbox(sbox2, s1, s2, s3, s0);
    const t2 = xk[k++] ^ applySbox(sbox2, s2, s3, s0, s1);
    const t3 = xk[k++] ^ applySbox(sbox2, s3, s0, s1, s2);
    return {
      s0: t0,
      s1: t1,
      s2: t2,
      s3: t3
    };
  }
  function ctr32(xk, isLE2, nonce, src, dst) {
    abytes(nonce, BLOCK_SIZE2, "nonce");
    abytes(src);
    dst = getOutput(src.length, dst);
    const ctr = nonce;
    const c32 = u32(ctr);
    const view = createView(ctr);
    const src32 = u32(src);
    const dst32 = u32(dst);
    const ctrPos = isLE2 ? 0 : 12;
    const srcLen = src.length;
    let ctrNum = view.getUint32(ctrPos, isLE2);
    for (let i = 0; i + 4 <= src32.length; i += 4) {
      const { s0, s1, s2, s3 } = encrypt(xk, swap8IfBE(c32[0]), swap8IfBE(c32[1]), swap8IfBE(c32[2]), swap8IfBE(c32[3]));
      dst32[i + 0] = src32[i + 0] ^ swap8IfBE(s0);
      dst32[i + 1] = src32[i + 1] ^ swap8IfBE(s1);
      dst32[i + 2] = src32[i + 2] ^ swap8IfBE(s2);
      dst32[i + 3] = src32[i + 3] ^ swap8IfBE(s3);
      ctrNum = ctrNum + 1 >>> 0;
      view.setUint32(ctrPos, ctrNum, isLE2);
    }
    const start = BLOCK_SIZE2 * Math.floor(src32.length / BLOCK_SIZE32);
    if (start < srcLen) {
      const { s0, s1, s2, s3 } = encrypt(xk, swap8IfBE(c32[0]), swap8IfBE(c32[1]), swap8IfBE(c32[2]), swap8IfBE(c32[3]));
      const b32 = new Uint32Array([s0, s1, s2, s3]);
      swap32IfBE(b32);
      const buf = u8(b32);
      for (let i = start, pos = 0; i < srcLen; i++, pos++)
        dst[i] = src[i] ^ buf[pos];
      clean(b32);
    }
    return dst;
  }
  function computeTag(fn, isLE2, key, data, AAD) {
    const aadLength = AAD ? AAD.length : 0;
    const h = fn.create(key, data.length + aadLength);
    if (AAD)
      h.update(AAD);
    const num = u64Lengths(8 * data.length, 8 * aadLength, isLE2);
    h.update(data);
    h.update(num);
    const res = h.digest();
    clean(num);
    return res;
  }
  var gcm = /* @__PURE__ */ wrapCipher({
    blockSize: 16,
    nonceLength: 12,
    tagLength: 16,
    withAAD: true,
    varSizeNonce: true
  }, function aesgcm(key, nonce, AAD) {
    if (nonce.length < 8)
      throw new Error("aes/gcm: invalid nonce length");
    const tagLength = 16;
    function _computeTag(authKey, tagMask, data) {
      const tag = computeTag(ghash, false, authKey, data, AAD);
      for (let i = 0; i < tagMask.length; i++)
        tag[i] ^= tagMask[i];
      return tag;
    }
    function deriveKeys() {
      const xk = expandKeyLE(key);
      const authKey = EMPTY_BLOCK.slice();
      const counter = EMPTY_BLOCK.slice();
      ctr32(xk, false, counter, counter, authKey);
      if (nonce.length === 12) {
        counter.set(nonce);
      } else {
        const nonceLen = EMPTY_BLOCK.slice();
        const view = createView(nonceLen);
        view.setBigUint64(8, BigInt(nonce.length * 8), false);
        const g = ghash.create(authKey).update(nonce).update(nonceLen);
        g.digestInto(counter);
        g.destroy();
      }
      const tagMask = ctr32(xk, false, counter, EMPTY_BLOCK);
      return {
        xk,
        authKey,
        counter,
        tagMask
      };
    }
    return {
      encrypt(plaintext) {
        const { xk, authKey, counter, tagMask } = deriveKeys();
        const out = new Uint8Array(plaintext.length + tagLength);
        const toClean = [xk, authKey, counter, tagMask];
        if (!isAligned32(plaintext))
          toClean.push(plaintext = copyBytes(plaintext));
        ctr32(xk, false, counter, plaintext, out.subarray(0, plaintext.length));
        const tag = _computeTag(authKey, tagMask, out.subarray(0, out.length - tagLength));
        toClean.push(tag);
        out.set(tag, plaintext.length);
        clean(...toClean);
        return out;
      },
      decrypt(ciphertext) {
        const { xk, authKey, counter, tagMask } = deriveKeys();
        const toClean = [xk, authKey, tagMask, counter];
        if (!isAligned32(ciphertext))
          toClean.push(ciphertext = copyBytes(ciphertext));
        const data = ciphertext.subarray(0, -tagLength);
        const passedTag = ciphertext.subarray(-tagLength);
        const tag = _computeTag(authKey, tagMask, data);
        toClean.push(tag);
        if (!equalBytes(tag, passedTag)) {
          clean(...toClean);
          throw new Error("aes-gcm: invalid tag");
        }
        const out = ctr32(xk, false, counter, data);
        clean(...toClean);
        return out;
      }
    };
  });

  // node_modules/@noble/hashes/_u64.js
  var fromNumH = (n) => n / 2 ** 32 | 0;
  var fromNumL = (n) => n >>> 0;
  function setU64FromNum(view, byteOffset, n, isLE2) {
    const h = fromNumH(n);
    const l = fromNumL(n);
    view.setUint32(byteOffset, isLE2 ? l : h, isLE2);
    view.setUint32(byteOffset + 4, isLE2 ? h : l, isLE2);
  }

  // node_modules/@noble/hashes/utils.js
  function isBytes2(a) {
    return a instanceof Uint8Array || ArrayBuffer.isView(a) && a.constructor.name === "Uint8Array" && "BYTES_PER_ELEMENT" in a && a.BYTES_PER_ELEMENT === 1;
  }
  var atitle2 = (title) => title ? `"${title}" ` : "";
  function anumber2(n, title = "") {
    if (typeof n !== "number")
      throw new TypeError(atitle2(title) + "expected number, got " + typeof n);
    if (!Number.isSafeInteger(n) || n < 0)
      throw new RangeError(atitle2(title) + "expected integer >= 0, got " + n);
    return n;
  }
  function abytes2(value, length, title = "") {
    if (isBytes2(value) && (length === void 0 || value.length === length))
      return value;
    if (length !== void 0)
      anumber2(length, "length");
    const bytes = isBytes2(value);
    const ofLen = length !== void 0 ? ` of length ${length}` : "";
    const got = bytes ? `length=${value.length}` : `type=${typeof value}`;
    const message = atitle2(title) + "expected Uint8Array" + ofLen + ", got " + got;
    if (!bytes)
      throw new TypeError(message);
    throw new RangeError(message);
  }
  function ahash(h) {
    if (typeof h !== "function" || typeof h.create !== "function")
      throw new TypeError("expected hash wrapped by utils.createHasher");
    anumber2(h.outputLen);
    anumber2(h.blockLen);
    if (h.outputLen < 1 || h.blockLen < 1)
      throw new Error("hash blockLen / outputLen must be >= 1");
  }
  var aobject = (value, label) => {
    if (value === null || typeof value !== "object" || Array.isArray(value))
      throw new TypeError((label === "object" ? "" : `"${label}" `) + "expected object, got type=" + typeof value);
  };
  var aopts = (value, label) => {
    aobject(value, label);
    const proto = Object.getPrototypeOf(value);
    if (proto !== Object.prototype && proto !== null)
      throw new TypeError(`"${label}" expected plain object`);
    if (Object.hasOwn(value, "__proto__"))
      throw new TypeError(`"${label}.__proto__" is not allowed`);
  };
  function aexists2(instance, checkFinished = true) {
    if (instance.destroyed)
      throw new Error("hash was destroyed");
    if (checkFinished && instance.finished)
      throw new Error("digest() was already called");
  }
  function aoutput2(out, instance) {
    abytes2(out, void 0, "output");
    const min = instance.outputLen;
    if (!(out.length >= min)) {
      throw new RangeError('"output" expected length >= ' + min);
    }
  }
  function clean2(...arrays) {
    for (let i = 0; i < arrays.length; i++) {
      arrays[i].fill(0);
    }
  }
  function createView2(arr) {
    return new DataView(arr.buffer, arr.byteOffset, arr.byteLength);
  }
  function rotr(word, shift) {
    return word << 32 - shift | word >>> shift;
  }
  var hasHexBuiltin = /* @__PURE__ */ (() => (
    // @ts-ignore
    typeof Uint8Array.from([]).toHex === "function" && typeof Uint8Array.fromHex === "function"
  ))();
  var hexes = /* @__PURE__ */ Array.from({
    length: 256
  }, (_, i) => i.toString(16).padStart(2, "0"));
  function bytesToHex(bytes) {
    abytes2(bytes);
    if (hasHexBuiltin)
      return bytes.toHex();
    let hex = "";
    for (let i = 0; i < bytes.length; i++) {
      hex += hexes[bytes[i]];
    }
    return hex;
  }
  function asciiToBase16(ch) {
    return ch >= 48 && ch <= 57 ? ch - 48 : ch >= 65 && ch <= 70 ? ch - (65 - 10) : ch >= 97 && ch <= 102 ? ch - (97 - 10) : void 0;
  }
  function hexToBytes(hex) {
    if (typeof hex !== "string")
      throw new TypeError("hex string expected, got " + typeof hex);
    if (hasHexBuiltin) {
      try {
        return Uint8Array.fromHex(hex);
      } catch (error) {
        if (error instanceof SyntaxError)
          throw new RangeError(error.message);
        throw error;
      }
    }
    const hl = hex.length;
    const al = hl / 2;
    if (hl % 2)
      throw new RangeError("hex string expected, got unpadded hex of length " + hl);
    const array = new Uint8Array(al);
    for (let ai = 0, hi = 0; ai < al; ai++, hi += 2) {
      const n1 = asciiToBase16(hex.charCodeAt(hi));
      const n2 = asciiToBase16(hex.charCodeAt(hi + 1));
      if (n1 === void 0 || n2 === void 0) {
        const char = hex[hi] + hex[hi + 1];
        throw new RangeError('hex string expected, got non-hex character "' + char + '" at index ' + hi);
      }
      array[ai] = n1 * 16 + n2;
    }
    return array;
  }
  function concatBytes2(...arrays) {
    let sum = 0;
    for (let i = 0; i < arrays.length; i++) {
      const a = arrays[i];
      abytes2(a);
      sum += a.length;
    }
    const res = new Uint8Array(sum);
    for (let i = 0, pad = 0; i < arrays.length; i++) {
      const a = arrays[i];
      res.set(a, pad);
      pad += a.length;
    }
    return res;
  }
  function checkOpts(defaults, opts, title = "opts") {
    aopts(defaults, "defaults");
    if (opts !== void 0)
      aopts(opts, title);
    const merged = Object.assign(/* @__PURE__ */ Object.create(null), defaults, opts);
    return merged;
  }
  function createHasher(hashCons, info = {}) {
    if (typeof hashCons !== "function")
      throw new TypeError('"hashCons" expected function, got type=' + typeof hashCons);
    info = checkOpts({}, info, "info");
    const hashC = (msg, opts) => hashCons(opts).update(msg).digest();
    const tmp = hashCons(void 0);
    hashC.outputLen = tmp.outputLen;
    hashC.blockLen = tmp.blockLen;
    hashC.canXOF = tmp.canXOF;
    hashC.create = (opts) => hashCons(opts);
    Object.assign(hashC, info);
    return Object.freeze(hashC);
  }
  function randomBytes(bytesLength = 32) {
    anumber2(bytesLength, "bytesLength");
    const cr = typeof globalThis === "object" ? globalThis.crypto : null;
    if (typeof cr?.getRandomValues !== "function")
      throw new Error("crypto.getRandomValues must be defined");
    if (bytesLength > 65536)
      throw new RangeError(`"bytesLength" expected <= 65536, got ${bytesLength}`);
    return cr.getRandomValues(new Uint8Array(bytesLength));
  }
  var oidNist = (suffix) => ({
    // Current NIST hashAlgs suffixes used here fit in one DER subidentifier octet.
    // Larger suffix values would need base-128 OID encoding and a different length byte.
    oid: Uint8Array.from([6, 9, 96, 134, 72, 1, 101, 3, 4, 2, suffix])
  });

  // node_modules/@noble/hashes/_md.js
  function _classCallCheck2(a, n) {
    if (!(a instanceof n))
      throw new TypeError("Cannot call a class as a function");
  }
  function _defineProperties2(e, r) {
    for (var t = 0; t < r.length; t++) {
      var o = r[t];
      o.enumerable = o.enumerable || false, o.configurable = true, "value" in o && (o.writable = true), Object.defineProperty(e, _toPropertyKey2(o.key), o);
    }
  }
  function _createClass2(e, r, t) {
    return r && _defineProperties2(e.prototype, r), t && _defineProperties2(e, t), Object.defineProperty(e, "prototype", { writable: false }), e;
  }
  function _defineProperty2(e, r, t) {
    return (r = _toPropertyKey2(r)) in e ? Object.defineProperty(e, r, { value: t, enumerable: true, configurable: true, writable: true }) : e[r] = t, e;
  }
  function _toPropertyKey2(t) {
    var i = _toPrimitive2(t, "string");
    return "symbol" == typeof i ? i : i + "";
  }
  function _toPrimitive2(t, e) {
    if ("object" != typeof t || !t)
      return t;
    var r;
    if ("undefined" != typeof Symbol && void 0 !== (r = t[Symbol.toPrimitive])) {
      var i = r.call(t, e || "default");
      if ("object" != typeof i)
        return i;
      throw new TypeError("@@toPrimitive must return a primitive value.");
    }
    return ("string" === e ? String : Number)(t);
  }
  function Chi(a, b, c) {
    return a & b ^ ~a & c;
  }
  function Maj(a, b, c) {
    return a & b ^ a & c ^ b & c;
  }
  var HashMD = /* @__PURE__ */ (function() {
    function HashMD2(blockLen, outputLen, padOffset, isLE2) {
      _classCallCheck2(this, HashMD2);
      _defineProperty2(this, "blockLen", void 0);
      _defineProperty2(this, "outputLen", void 0);
      _defineProperty2(this, "canXOF", false);
      _defineProperty2(this, "padOffset", void 0);
      _defineProperty2(this, "isLE", void 0);
      _defineProperty2(this, "buffer", void 0);
      _defineProperty2(this, "view", void 0);
      _defineProperty2(this, "finished", false);
      _defineProperty2(this, "length", 0);
      _defineProperty2(this, "pos", 0);
      _defineProperty2(this, "destroyed", false);
      this.blockLen = blockLen;
      this.outputLen = outputLen;
      this.padOffset = padOffset;
      this.isLE = isLE2;
      this.buffer = new Uint8Array(blockLen);
      this.view = createView2(this.buffer);
    }
    return _createClass2(HashMD2, [{
      key: "update",
      value: function update(data) {
        aexists2(this);
        abytes2(data);
        const { view, buffer, blockLen } = this;
        const len = data.length;
        let processed = false;
        for (let pos = 0; pos < len; ) {
          const take = Math.min(blockLen - this.pos, len - pos);
          if (take === blockLen) {
            const dataView = createView2(data);
            for (; blockLen <= len - pos; pos += blockLen)
              this.process(dataView, pos);
            processed = true;
            continue;
          }
          buffer.set(pos === 0 && take === len ? data : data.subarray(pos, pos + take), this.pos);
          this.pos += take;
          pos += take;
          if (this.pos === blockLen) {
            this.process(view, 0);
            this.pos = 0;
            processed = true;
          }
        }
        this.length += data.length;
        if (processed)
          this.roundClean();
        return this;
      }
    }, {
      key: "digestInto",
      value: function digestInto(out) {
        aexists2(this);
        aoutput2(out, this);
        this.finished = true;
        const { buffer, view, blockLen, isLE: isLE2 } = this;
        let { pos } = this;
        buffer[pos++] = 128;
        buffer.fill(0, pos);
        if (this.padOffset > blockLen - pos) {
          this.process(view, 0);
          buffer.fill(0);
        }
        setU64FromNum(view, blockLen - 8, this.length * 8, isLE2);
        this.process(view, 0);
        this.roundClean();
        const oview = out === buffer ? view : createView2(out);
        const len = this.outputLen;
        const outLen = len / 4;
        const state = this.get();
        if (len % 4 || outLen > state.length)
          throw new Error("invalid outputLen");
        for (let i = 0; i < outLen; i++)
          oview.setUint32(4 * i, state[i], isLE2);
      }
    }, {
      key: "digest",
      value: function digest2() {
        const { buffer, outputLen } = this;
        this.digestInto(buffer);
        const res = buffer.slice(0, outputLen);
        this.destroy();
        return res;
      }
    }, {
      key: "_cloneIntoMeta",
      value: function _cloneIntoMeta(to) {
        const { buffer, length, finished, destroyed, pos } = this;
        to.destroyed = destroyed;
        to.finished = finished;
        to.length = length;
        to.pos = pos;
        if (pos)
          to.buffer.set(buffer);
        return to;
      }
    }, {
      key: "clone",
      value: function clone() {
        return this._cloneInto();
      }
    }]);
  })();
  var SHA256_IV = /* @__PURE__ */ Uint32Array.from([1779033703, 3144134277, 1013904242, 2773480762, 1359893119, 2600822924, 528734635, 1541459225]);

  // node_modules/@noble/hashes/sha2.js
  function _classCallCheck3(a, n) {
    if (!(a instanceof n))
      throw new TypeError("Cannot call a class as a function");
  }
  function _defineProperties3(e, r) {
    for (var t = 0; t < r.length; t++) {
      var o = r[t];
      o.enumerable = o.enumerable || false, o.configurable = true, "value" in o && (o.writable = true), Object.defineProperty(e, _toPropertyKey3(o.key), o);
    }
  }
  function _createClass3(e, r, t) {
    return r && _defineProperties3(e.prototype, r), t && _defineProperties3(e, t), Object.defineProperty(e, "prototype", { writable: false }), e;
  }
  function _callSuper(t, o, e) {
    return o = _getPrototypeOf(o), _possibleConstructorReturn(t, _isNativeReflectConstruct() ? Reflect.construct(o, e || [], _getPrototypeOf(t).constructor) : o.apply(t, e));
  }
  function _possibleConstructorReturn(t, e) {
    if (e && ("object" == typeof e || "function" == typeof e))
      return e;
    if (void 0 !== e)
      throw new TypeError("Derived constructors may only return object or undefined");
    return _assertThisInitialized(t);
  }
  function _assertThisInitialized(e) {
    if (void 0 === e)
      throw new ReferenceError("this hasn't been initialised - super() hasn't been called");
    return e;
  }
  function _isNativeReflectConstruct() {
    try {
      var t = !Boolean.prototype.valueOf.call(Reflect.construct(Boolean, [], function() {
      }));
    } catch (t2) {
    }
    return (_isNativeReflectConstruct = function() {
      return !!t;
    })();
  }
  function _getPrototypeOf(t) {
    return _getPrototypeOf = Object.setPrototypeOf ? Object.getPrototypeOf.bind() : function(t2) {
      return t2.__proto__ || Object.getPrototypeOf(t2);
    }, _getPrototypeOf(t);
  }
  function _inherits(t, e) {
    if ("function" != typeof e && null !== e)
      throw new TypeError("Super expression must either be null or a function");
    t.prototype = Object.create(e && e.prototype, { constructor: { value: t, writable: true, configurable: true } }), Object.defineProperty(t, "prototype", { writable: false }), e && _setPrototypeOf(t, e);
  }
  function _setPrototypeOf(t, e) {
    return _setPrototypeOf = Object.setPrototypeOf ? Object.setPrototypeOf.bind() : function(t2, e2) {
      return t2.__proto__ = e2, t2;
    }, _setPrototypeOf(t, e);
  }
  function _defineProperty3(e, r, t) {
    return (r = _toPropertyKey3(r)) in e ? Object.defineProperty(e, r, { value: t, enumerable: true, configurable: true, writable: true }) : e[r] = t, e;
  }
  function _toPropertyKey3(t) {
    var i = _toPrimitive3(t, "string");
    return "symbol" == typeof i ? i : i + "";
  }
  function _toPrimitive3(t, e) {
    if ("object" != typeof t || !t)
      return t;
    var r;
    if ("undefined" != typeof Symbol && void 0 !== (r = t[Symbol.toPrimitive])) {
      var i = r.call(t, e || "default");
      if ("object" != typeof i)
        return i;
      throw new TypeError("@@toPrimitive must return a primitive value.");
    }
    return ("string" === e ? String : Number)(t);
  }
  var SHA256_K = /* @__PURE__ */ Uint32Array.from([1116352408, 1899447441, 3049323471, 3921009573, 961987163, 1508970993, 2453635748, 2870763221, 3624381080, 310598401, 607225278, 1426881987, 1925078388, 2162078206, 2614888103, 3248222580, 3835390401, 4022224774, 264347078, 604807628, 770255983, 1249150122, 1555081692, 1996064986, 2554220882, 2821834349, 2952996808, 3210313671, 3336571891, 3584528711, 113926993, 338241895, 666307205, 773529912, 1294757372, 1396182291, 1695183700, 1986661051, 2177026350, 2456956037, 2730485921, 2820302411, 3259730800, 3345764771, 3516065817, 3600352804, 4094571909, 275423344, 430227734, 506948616, 659060556, 883997877, 958139571, 1322822218, 1537002063, 1747873779, 1955562222, 2024104815, 2227730452, 2361852424, 2428436474, 2756734187, 3204031479, 3329325298]);
  var SHA256_W = /* @__PURE__ */ new Uint32Array(64);
  var SHA2_32B = /* @__PURE__ */ (function(_HashMD) {
    function SHA2_32B2(outputLen, IV) {
      var _this;
      _classCallCheck3(this, SHA2_32B2);
      _this = _callSuper(this, SHA2_32B2, [64, outputLen, 8, false]);
      _defineProperty3(_this, "A", 0);
      _defineProperty3(_this, "B", 0);
      _defineProperty3(_this, "C", 0);
      _defineProperty3(_this, "D", 0);
      _defineProperty3(_this, "E", 0);
      _defineProperty3(_this, "F", 0);
      _defineProperty3(_this, "G", 0);
      _defineProperty3(_this, "H", 0);
      _this.A = IV[0] | 0;
      _this.B = IV[1] | 0;
      _this.C = IV[2] | 0;
      _this.D = IV[3] | 0;
      _this.E = IV[4] | 0;
      _this.F = IV[5] | 0;
      _this.G = IV[6] | 0;
      _this.H = IV[7] | 0;
      return _this;
    }
    _inherits(SHA2_32B2, _HashMD);
    return _createClass3(SHA2_32B2, [{
      key: "get",
      value: function get() {
        const { A, B, C, D, E, F, G, H } = this;
        return [A, B, C, D, E, F, G, H];
      }
      // prettier-ignore
    }, {
      key: "set",
      value: function set(A, B, C, D, E, F, G, H) {
        this.A = A | 0;
        this.B = B | 0;
        this.C = C | 0;
        this.D = D | 0;
        this.E = E | 0;
        this.F = F | 0;
        this.G = G | 0;
        this.H = H | 0;
      }
    }, {
      key: "_cloneInto",
      value: function _cloneInto(to) {
        (to ||= new this.constructor()).set(...this.get());
        return this._cloneIntoMeta(to);
      }
    }, {
      key: "process",
      value: function process(view, offset) {
        for (let i = 0; i < 16; i++, offset += 4)
          SHA256_W[i] = view.getUint32(offset, false);
        for (let i = 16; i < 64; i++) {
          const W15 = SHA256_W[i - 15];
          const W2 = SHA256_W[i - 2];
          const s0 = rotr(W15, 7) ^ rotr(W15, 18) ^ W15 >>> 3;
          const s1 = rotr(W2, 17) ^ rotr(W2, 19) ^ W2 >>> 10;
          SHA256_W[i] = s1 + SHA256_W[i - 7] + s0 + SHA256_W[i - 16] | 0;
        }
        let { A, B, C, D, E, F, G, H } = this;
        for (let i = 0; i < 64; i++) {
          const sigma1 = rotr(E, 6) ^ rotr(E, 11) ^ rotr(E, 25);
          const T1 = H + sigma1 + Chi(E, F, G) + SHA256_K[i] + SHA256_W[i] | 0;
          const sigma0 = rotr(A, 2) ^ rotr(A, 13) ^ rotr(A, 22);
          const T2 = sigma0 + Maj(A, B, C) | 0;
          H = G;
          G = F;
          F = E;
          E = D + T1 | 0;
          D = C;
          C = B;
          B = A;
          A = T1 + T2 | 0;
        }
        A = A + this.A | 0;
        B = B + this.B | 0;
        C = C + this.C | 0;
        D = D + this.D | 0;
        E = E + this.E | 0;
        F = F + this.F | 0;
        G = G + this.G | 0;
        H = H + this.H | 0;
        this.set(A, B, C, D, E, F, G, H);
      }
    }, {
      key: "roundClean",
      value: function roundClean() {
        clean2(SHA256_W);
      }
    }, {
      key: "destroy",
      value: function destroy() {
        this.destroyed = true;
        this.set(0, 0, 0, 0, 0, 0, 0, 0);
        clean2(this.buffer);
      }
    }]);
  })(HashMD);
  var _SHA256 = /* @__PURE__ */ (function(_SHA2_32B2) {
    function _SHA2562() {
      _classCallCheck3(this, _SHA2562);
      return _callSuper(this, _SHA2562, [32, SHA256_IV]);
    }
    _inherits(_SHA2562, _SHA2_32B2);
    return _createClass3(_SHA2562);
  })(SHA2_32B);
  var sha256 = /* @__PURE__ */ createHasher(() => new _SHA256(), /* @__PURE__ */ oidNist(1));

  // node_modules/@noble/curves/utils.js
  function aarray(item, title, inner = () => {
  }) {
    if (!Array.isArray(item))
      throw new TypeError(`"${title}" expected array, got type=${typeof item}`);
    for (let i = 0; i < item.length; i++)
      inner(item[i], `${title}[${i}]`);
    return item;
  }
  var abytes3 = (value, length, title) => abytes2(value, length, title);
  var anumber3 = anumber2;
  function astring(value, title = "") {
    if (typeof value !== "string") {
      const prefix = title && `"${title}" `;
      throw new TypeError(prefix + "expected string, got type=" + typeof value);
    }
    return value;
  }
  function aobject2(value, title = "object") {
    if (value === null || typeof value !== "object" || Array.isArray(value))
      throw new TypeError(title === "object" ? "expected valid options object" : `"${title}" expected object, got type=${typeof value}`);
    return value;
  }
  function afunction(value, title) {
    if (typeof value !== "function")
      throw new TypeError(`"${title}" is invalid: expected function, got ${typeof value}`);
    return value;
  }
  var bytesToHex2 = bytesToHex;
  var concatBytes3 = (...arrays) => concatBytes2(...arrays);
  var hexToBytes2 = (hex) => hexToBytes(hex);
  var isBytes3 = isBytes2;
  var randomBytes2 = (bytesLength) => randomBytes(bytesLength);
  var _0n = /* @__PURE__ */ BigInt(0);
  var _1n = /* @__PURE__ */ BigInt(1);
  var atitle3 = (title) => title ? `"${title}" ` : "";
  function abool2(value, title = "") {
    if (typeof value !== "boolean")
      throw new TypeError(atitle3(title) + "expected boolean, got type=" + typeof value);
    return value;
  }
  function abignumber(n) {
    if (typeof n === "bigint") {
      if (!isPosBig(n))
        throw new RangeError("positive bigint expected, got " + n);
    } else
      anumber3(n);
    return n;
  }
  function asafenumber(value, title = "") {
    if (typeof value !== "number") {
      const prefix = title && `"${title}" `;
      throw new TypeError(prefix + "expected number, got type=" + typeof value);
    }
    if (!Number.isSafeInteger(value)) {
      const prefix = title && `"${title}" `;
      throw new RangeError(prefix + "expected safe integer, got " + value);
    }
  }
  function numberToHexUnpadded(num) {
    const hex = abignumber(num).toString(16);
    return hex.length & 1 ? "0" + hex : hex;
  }
  function hexToNumber(hex) {
    if (typeof hex !== "string")
      throw new TypeError("hex string expected, got " + typeof hex);
    return hex === "" ? _0n : BigInt("0x" + hex);
  }
  function bytesToNumberBE(bytes) {
    return hexToNumber(bytesToHex(bytes));
  }
  function bytesToNumberLE(bytes) {
    return hexToNumber(bytesToHex(copyBytes2(abytes2(bytes)).reverse()));
  }
  function numberToBytesBE(n, len) {
    anumber2(len);
    if (len === 0)
      throw new Error("zero output length is invalid");
    n = abignumber(n);
    const expectedLen = len * 2;
    const hex = n.toString(16);
    if (hex.length > expectedLen)
      throw new RangeError("number is too large");
    return hexToBytes(hex.padStart(expectedLen, "0"));
  }
  function numberToBytesLE(n, len) {
    return numberToBytesBE(n, len).reverse();
  }
  function copyBytes2(bytes) {
    return Uint8Array.from(abytes3(bytes));
  }
  function isPosBig(n) {
    return typeof n === "bigint" && _0n <= n;
  }
  function inRange(n, min, max) {
    return isPosBig(n) && isPosBig(min) && isPosBig(max) && min <= n && n < max;
  }
  function aInRange(title, n, min, max) {
    if (!inRange(n, min, max))
      throw new RangeError("expected valid " + title + ": " + min + " <= n < " + max + ", got " + n);
  }
  function bitLen(n) {
    if (n < _0n)
      throw new Error("expected non-negative bigint, got " + n);
    return n === _0n ? 0 : n.toString(2).length;
  }
  var bitMask = (n) => {
    asafenumber(n, "n");
    return (_1n << BigInt(n)) - _1n;
  };
  function createHmacDrbg(hashLen, qByteLen, hmacFn) {
    anumber2(hashLen, "hashLen");
    anumber2(qByteLen, "qByteLen");
    if (typeof hmacFn !== "function")
      throw new TypeError("hmacFn must be a function");
    const u8n = (len) => new Uint8Array(len);
    const NULL = Uint8Array.of();
    const byte0 = Uint8Array.of(0);
    const byte1 = Uint8Array.of(1);
    const _maxDrbgIters = 1e3;
    let v = u8n(hashLen);
    let k = u8n(hashLen);
    let i = 0;
    const reset2 = () => {
      v.fill(1);
      k.fill(0);
      i = 0;
    };
    const h = (...msgs) => hmacFn(k, concatBytes3(v, ...msgs));
    const reseed = (seed = NULL) => {
      k = h(byte0, seed);
      v = h();
      if (seed.length === 0)
        return;
      k = h(byte1, seed);
      v = h();
    };
    const gen = () => {
      if (i++ >= _maxDrbgIters)
        throw new Error("drbg: tried max amount of iterations");
      let len = 0;
      const out = [];
      while (len < qByteLen) {
        v = h();
        const sl = v.slice();
        out.push(sl);
        len += v.length;
      }
      return concatBytes3(...out);
    };
    const genUntil = (seed, pred) => {
      reset2();
      reseed(seed);
      let res = void 0;
      while ((res = pred(gen())) === void 0)
        reseed();
      reset2();
      return res;
    };
    return genUntil;
  }
  function validateObject(object, fields = {}, optFields = {}, title = "object") {
    aobject2(object, title);
    aobject2(fields, "fields");
    aobject2(optFields, "optFields");
    function checkField(fieldName, expectedType, isOpt) {
      const label = title === "object" ? `param "${String(fieldName)}"` : `"${title}.${String(fieldName)}"`;
      const val = object[fieldName];
      if (!Object.hasOwn(object, fieldName) && (isOpt ? val !== void 0 : expectedType !== "function")) {
        throw new TypeError(`${label} is invalid: expected own property`);
      }
      if (isOpt && val === void 0)
        return;
      const current = typeof val;
      if (current !== expectedType || val === null)
        throw new TypeError(`${label} is invalid: expected ${expectedType}, got ${current}`);
    }
    const iter = (f, isOpt) => Object.entries(f).forEach(([k, v]) => checkField(k, v, isOpt));
    iter(fields, false);
    iter(optFields, true);
  }

  // node_modules/@noble/curves/abstract/modular.js
  function _classCallCheck4(a, n) {
    if (!(a instanceof n))
      throw new TypeError("Cannot call a class as a function");
  }
  function _defineProperties4(e, r) {
    for (var t = 0; t < r.length; t++) {
      var o = r[t];
      o.enumerable = o.enumerable || false, o.configurable = true, "value" in o && (o.writable = true), Object.defineProperty(e, _toPropertyKey4(o.key), o);
    }
  }
  function _createClass4(e, r, t) {
    return r && _defineProperties4(e.prototype, r), t && _defineProperties4(e, t), Object.defineProperty(e, "prototype", { writable: false }), e;
  }
  function _defineProperty4(e, r, t) {
    return (r = _toPropertyKey4(r)) in e ? Object.defineProperty(e, r, { value: t, enumerable: true, configurable: true, writable: true }) : e[r] = t, e;
  }
  function _toPropertyKey4(t) {
    var i = _toPrimitive4(t, "string");
    return "symbol" == typeof i ? i : i + "";
  }
  function _toPrimitive4(t, e) {
    if ("object" != typeof t || !t)
      return t;
    var r;
    if ("undefined" != typeof Symbol && void 0 !== (r = t[Symbol.toPrimitive])) {
      var i = r.call(t, e || "default");
      if ("object" != typeof i)
        return i;
      throw new TypeError("@@toPrimitive must return a primitive value.");
    }
    return ("string" === e ? String : Number)(t);
  }
  var _0n2 = /* @__PURE__ */ BigInt(0);
  var _1n2 = /* @__PURE__ */ BigInt(1);
  var _2n = /* @__PURE__ */ BigInt(2);
  var _3n = /* @__PURE__ */ BigInt(3);
  var _4n = /* @__PURE__ */ BigInt(4);
  var _5n = /* @__PURE__ */ BigInt(5);
  var _7n = /* @__PURE__ */ BigInt(7);
  var _8n = /* @__PURE__ */ BigInt(8);
  var _9n = /* @__PURE__ */ BigInt(9);
  var _15n = /* @__PURE__ */ BigInt(15);
  var _16n = /* @__PURE__ */ BigInt(16);
  var POW_WINDOWED_MIN = /* @__PURE__ */ BigInt("0x10000000000000000");
  function mod(a, b) {
    if (b <= _0n2)
      throw new Error("mod: expected positive modulus, got " + b);
    const result = a % b;
    return result >= _0n2 ? result : b + result;
  }
  function _pow(num, power, modulo) {
    if (modulo <= _1n2)
      throw new Error("pow: expected modulus > 1, got " + modulo);
    if (typeof power !== "bigint")
      throw new TypeError("invalid exponent: expected bigint, got " + typeof power);
    if (power < _0n2)
      throw new Error("invalid exponent, negatives unsupported");
    if (power === _0n2)
      return _1n2;
    if (power === _1n2)
      return num;
    let d = num % modulo;
    if (d < _0n2)
      d += modulo;
    if (power < POW_WINDOWED_MIN) {
      let p2 = _1n2;
      while (power > _0n2) {
        if (power & _1n2)
          p2 = p2 * d % modulo;
        d = d * d % modulo;
        power >>= _1n2;
      }
      return p2;
    }
    const digits = [];
    while (power > _0n2) {
      digits.push(Number(power & _15n));
      power >>= _4n;
    }
    const table = new Array(16);
    table[0] = _1n2;
    table[1] = d;
    for (let i = 2; i < 16; i++)
      table[i] = table[i - 1] * d % modulo;
    let p = table[digits[digits.length - 1]];
    for (let w = digits.length - 2; w >= 0; w--) {
      p = p * p % modulo;
      p = p * p % modulo;
      p = p * p % modulo;
      p = p * p % modulo;
      const digit = digits[w];
      if (digit !== 0)
        p = p * table[digit] % modulo;
    }
    return p;
  }
  function invert(number, modulo) {
    if (number === _0n2)
      throw new Error("invert: expected non-zero number");
    if (modulo <= _1n2)
      throw new Error("invert: expected modulus > 1, got " + modulo);
    let a = mod(number, modulo);
    let b = modulo;
    let x = _0n2, u = _1n2;
    while (a !== _0n2) {
      const q = b / a;
      const r = b - a * q;
      const m = x - u * q;
      b = a, a = r, x = u, u = m;
    }
    const gcd = b;
    if (gcd !== _1n2)
      throw new Error("invert: does not exist");
    return mod(x, modulo);
  }
  function invertCt(a, prime) {
    if (prime <= _1n2)
      throw new Error("invertCt: expected prime modulus > 1, got " + prime);
    const an = mod(a, prime);
    if (an === _0n2)
      throw new Error("invertCt: expected non-zero number");
    const inverse = _pow(an, prime - _2n, prime);
    if (mod(an * inverse, prime) !== _1n2)
      throw new Error("invertCt: does not exist");
    return inverse;
  }
  function assertIsSquare(Fp, root, n) {
    const F = Fp;
    if (!F.eql(F.sqr(root), n))
      throw new Error("Cannot find square root");
  }
  function aoddModulus(order, fnName) {
    if ((order & _1n2) === _0n2)
      throw new Error(fnName + ": expected odd modulus, got " + order);
  }
  function sqrt3mod4(Fp, n) {
    const F = Fp;
    const p1div4 = (F.ORDER + _1n2) / _4n;
    const root = F.pow(n, p1div4);
    assertIsSquare(F, root, n);
    return root;
  }
  function sqrt5mod8(Fp, n) {
    const F = Fp;
    const p5div8 = (F.ORDER - _5n) / _8n;
    const n2 = F.mul(n, _2n);
    const v = F.pow(n2, p5div8);
    const nv = F.mul(n, v);
    const i = F.mul(F.mul(nv, _2n), v);
    const root = F.mul(nv, F.sub(i, F.ONE));
    assertIsSquare(F, root, n);
    return root;
  }
  function sqrt9mod16(P) {
    const Fp_ = Field(P);
    const tn = tonelliShanks(P);
    const c1 = tn(Fp_, Fp_.neg(Fp_.ONE));
    const c2 = tn(Fp_, c1);
    const c3 = tn(Fp_, Fp_.neg(c1));
    const c4 = (P + _7n) / _16n;
    return (Fp, n) => {
      const F = Fp;
      let tv1 = F.pow(n, c4);
      let tv2 = F.mul(tv1, c1);
      const tv3 = F.mul(tv1, c2);
      const tv4 = F.mul(tv1, c3);
      const e1 = F.eql(F.sqr(tv2), n);
      const e2 = F.eql(F.sqr(tv3), n);
      tv1 = F.cmov(tv1, tv2, e1);
      tv2 = F.cmov(tv4, tv3, e2);
      const e3 = F.eql(F.sqr(tv2), n);
      const root = F.cmov(tv1, tv2, e3);
      assertIsSquare(F, root, n);
      return root;
    };
  }
  function tonelliShanks(P) {
    if (P < _3n)
      throw new Error("sqrt is not defined for small field");
    aoddModulus(P, "tonelliShanks");
    let Q = P - _1n2;
    let S = 0;
    while (Q % _2n === _0n2) {
      Q /= _2n;
      S++;
    }
    let Z = _2n;
    const _Fp = Field(P);
    while (FpLegendre(_Fp, Z) === 1) {
      if (Z++ > 1e3)
        throw new Error("Cannot find square root: probably non-prime P");
    }
    if (S === 1)
      return sqrt3mod4;
    let cc = _Fp.pow(Z, Q);
    const Q1div2 = (Q + _1n2) / _2n;
    return function tonelliSlow(Fp, n) {
      const F = Fp;
      if (F.is0(n))
        return n;
      if (FpLegendre(F, n) !== 1)
        throw new Error("Cannot find square root");
      let M = S;
      let c = F.mul(F.ONE, cc);
      let t = F.pow(n, Q);
      let R = F.pow(n, Q1div2);
      while (!F.eql(t, F.ONE)) {
        if (F.is0(t))
          throw new Error("Cannot find square root: probably non-prime P");
        let i = 1;
        let t_tmp = F.sqr(t);
        while (!F.eql(t_tmp, F.ONE)) {
          i++;
          t_tmp = F.sqr(t_tmp);
          if (i === M)
            throw new Error("Cannot find square root");
        }
        const exponent = _1n2 << BigInt(M - i - 1);
        const b = F.pow(c, exponent);
        M = i;
        c = F.sqr(b);
        t = F.mul(t, c);
        R = F.mul(R, b);
      }
      return R;
    };
  }
  function FpSqrt(P) {
    aoddModulus(P, "Fp.sqrt");
    if (P % _4n === _3n)
      return sqrt3mod4;
    if (P % _8n === _5n)
      return sqrt5mod8;
    if (P % _16n === _9n)
      return sqrt9mod16(P);
    return tonelliShanks(P);
  }
  var FIELD_FIELDS = ["create", "isValid", "is0", "neg", "inv", "sqrt", "sqr", "eql", "add", "sub", "mul", "pow", "div", "addN", "subN", "mulN", "sqrN"];
  function validateField(field) {
    aobject2(field, "field");
    if (typeof field.ORDER !== "bigint")
      throw new TypeError('param "ORDER" is invalid: expected bigint, got ' + typeof field.ORDER);
    asafenumber(field.BYTES, "BYTES");
    asafenumber(field.BITS, "BITS");
    for (const name of FIELD_FIELDS)
      afunction(field[name], "field." + name);
    if (field.BYTES < 1 || field.BITS < 1)
      throw new Error("invalid field: expected BYTES/BITS > 0");
    if (field.ORDER <= _1n2)
      throw new Error("invalid field: expected ORDER > 1, got " + field.ORDER);
    return field;
  }
  function FpInvertBatch(Fp, nums, passZero = false) {
    validateField(Fp);
    aarray(nums, "nums");
    abool2(passZero, "passZero");
    const F = Fp;
    const inverted = new Array(nums.length).fill(passZero ? F.ZERO : void 0);
    const multipliedAcc = nums.reduce((acc, num, i) => {
      if (F.is0(num))
        return acc;
      inverted[i] = acc;
      return F.mul(acc, num);
    }, F.ONE);
    const invertedAcc = F.inv(multipliedAcc);
    nums.reduceRight((acc, num, i) => {
      if (F.is0(num))
        return acc;
      inverted[i] = F.mul(acc, inverted[i]);
      return F.mul(acc, num);
    }, invertedAcc);
    return inverted;
  }
  function FpLegendre(Fp, n) {
    validateField(Fp);
    const F = Fp;
    aoddModulus(F.ORDER, "FpLegendre");
    const p1mod2 = (F.ORDER - _1n2) / _2n;
    const powered = F.pow(n, p1mod2);
    const yes = F.eql(powered, F.ONE);
    const zero = F.eql(powered, F.ZERO);
    const no = F.eql(powered, F.neg(F.ONE));
    if (!yes && !zero && !no)
      throw new Error("invalid Legendre symbol result");
    return yes ? 1 : zero ? 0 : -1;
  }
  function nLength(n, nBitLength) {
    if (nBitLength !== void 0)
      anumber3(nBitLength);
    if (n <= _0n2)
      throw new Error("invalid n length: expected positive n, got " + n);
    if (nBitLength !== void 0 && nBitLength < 1)
      throw new Error("invalid n length: expected positive bit length, got " + nBitLength);
    const bits = bitLen(n);
    if (nBitLength !== void 0 && nBitLength < bits)
      throw new Error(`invalid n length: expected nBitLength (${nBitLength}) >= bitLen(n) (${bits})`);
    const _nBitLength = nBitLength !== void 0 ? nBitLength : bits;
    const nByteLength = Math.ceil(_nBitLength / 8);
    return {
      nBitLength: _nBitLength,
      nByteLength
    };
  }
  var FIELD_SQRT = /* @__PURE__ */ new WeakMap();
  var _Field = /* @__PURE__ */ (function() {
    function _Field2(ORDER, opts = {}) {
      _classCallCheck4(this, _Field2);
      _defineProperty4(this, "ORDER", void 0);
      _defineProperty4(this, "BITS", void 0);
      _defineProperty4(this, "BYTES", void 0);
      _defineProperty4(this, "isLE", void 0);
      _defineProperty4(this, "ZERO", _0n2);
      _defineProperty4(this, "ONE", _1n2);
      _defineProperty4(this, "_lengths", void 0);
      _defineProperty4(this, "_mod", void 0);
      if (ORDER <= _1n2)
        throw new Error("invalid field: expected ORDER > 1, got " + ORDER);
      let _nbitLength = void 0;
      this.isLE = false;
      if (opts != null && typeof opts === "object") {
        if (typeof opts.BITS === "number")
          _nbitLength = opts.BITS;
        if (typeof opts.sqrt === "function")
          Object.defineProperty(this, "sqrt", {
            value: opts.sqrt,
            enumerable: true
          });
        if (typeof opts.isLE === "boolean")
          this.isLE = opts.isLE;
        if (opts.allowedLengths)
          this._lengths = Object.freeze(opts.allowedLengths.slice());
        if (typeof opts.modFromBytes === "boolean")
          this._mod = opts.modFromBytes;
      }
      const { nBitLength, nByteLength } = nLength(ORDER, _nbitLength);
      if (nByteLength > 2048)
        throw new Error("invalid field: expected ORDER of <= 2048 bytes");
      this.ORDER = ORDER;
      this.BITS = nBitLength;
      this.BYTES = nByteLength;
      Object.freeze(this);
    }
    return _createClass4(_Field2, [{
      key: "create",
      value: function create(num) {
        return mod(num, this.ORDER);
      }
    }, {
      key: "isValid",
      value: function isValid(num) {
        if (typeof num !== "bigint")
          throw new TypeError("invalid field element: expected bigint, got " + typeof num);
        return _0n2 <= num && num < this.ORDER;
      }
    }, {
      key: "is0",
      value: function is0(num) {
        return num === _0n2;
      }
      // is valid and invertible
    }, {
      key: "isValidNot0",
      value: function isValidNot0(num) {
        return !this.is0(num) && this.isValid(num);
      }
    }, {
      key: "isOdd",
      value: function isOdd(num) {
        return (num & _1n2) === _1n2;
      }
    }, {
      key: "neg",
      value: function neg(num) {
        return mod(-num, this.ORDER);
      }
    }, {
      key: "eql",
      value: function eql(lhs, rhs) {
        return lhs === rhs;
      }
    }, {
      key: "sqr",
      value: function sqr(num) {
        return mod(num * num, this.ORDER);
      }
    }, {
      key: "add",
      value: function add(lhs, rhs) {
        return mod(lhs + rhs, this.ORDER);
      }
    }, {
      key: "sub",
      value: function sub(lhs, rhs) {
        return mod(lhs - rhs, this.ORDER);
      }
    }, {
      key: "mul",
      value: function mul3(lhs, rhs) {
        return mod(lhs * rhs, this.ORDER);
      }
    }, {
      key: "pow",
      value: function pow(num, power) {
        return _pow(num, power, this.ORDER);
      }
    }, {
      key: "div",
      value: function div(lhs, rhs) {
        return mod(lhs * invert(rhs, this.ORDER), this.ORDER);
      }
      // Same as above, but doesn't normalize
    }, {
      key: "sqrN",
      value: function sqrN(num) {
        return num * num;
      }
    }, {
      key: "addN",
      value: function addN(lhs, rhs) {
        return lhs + rhs;
      }
    }, {
      key: "subN",
      value: function subN(lhs, rhs) {
        return lhs - rhs;
      }
    }, {
      key: "mulN",
      value: function mulN(lhs, rhs) {
        return lhs * rhs;
      }
    }, {
      key: "inv",
      value: function inv(num) {
        return invert(num, this.ORDER);
      }
    }, {
      key: "sqrt",
      value: function sqrt(num) {
        let sqrt2 = FIELD_SQRT.get(this);
        if (!sqrt2)
          FIELD_SQRT.set(this, sqrt2 = FpSqrt(this.ORDER));
        return sqrt2(this, num);
      }
    }, {
      key: "toBytes",
      value: function toBytes(num) {
        return this.isLE ? numberToBytesLE(num, this.BYTES) : numberToBytesBE(num, this.BYTES);
      }
    }, {
      key: "fromBytes",
      value: function fromBytes(bytes, skipValidation = false) {
        abytes3(bytes);
        const { _lengths: allowedLengths, BYTES, isLE: isLE2, ORDER, _mod: modFromBytes } = this;
        if (allowedLengths) {
          if (bytes.length < 1 || !allowedLengths.includes(bytes.length) || bytes.length > BYTES) {
            throw new Error("Field.fromBytes: expected " + allowedLengths + " bytes, got " + bytes.length);
          }
          const padded = new Uint8Array(BYTES);
          padded.set(bytes, isLE2 ? 0 : padded.length - bytes.length);
          bytes = padded;
        }
        if (bytes.length !== BYTES)
          throw new Error("Field.fromBytes: expected " + BYTES + " bytes, got " + bytes.length);
        let scalar = isLE2 ? bytesToNumberLE(bytes) : bytesToNumberBE(bytes);
        if (modFromBytes)
          scalar = mod(scalar, ORDER);
        if (!skipValidation) {
          if (!this.isValid(scalar))
            throw new Error("invalid field element: outside of range 0..ORDER");
        }
        return scalar;
      }
      // TODO: we don't need it here, move out to separate fn
    }, {
      key: "invertBatch",
      value: function invertBatch(lst) {
        return FpInvertBatch(this, lst, true);
      }
      // We can't move this out because Fp6, Fp12 implement it
      // and it's unclear what to return in there.
    }, {
      key: "cmov",
      value: function cmov(a, b, condition) {
        abool2(condition, "condition");
        return condition ? b : a;
      }
    }]);
  })();
  function Field(ORDER, opts = {}) {
    Object.freeze(_Field.prototype);
    return new _Field(ORDER, opts);
  }
  function getFieldBytesLength(fieldOrder) {
    if (typeof fieldOrder !== "bigint")
      throw new Error("field order must be bigint");
    if (fieldOrder <= _1n2)
      throw new Error("field order must be greater than 1");
    const bitLength = bitLen(fieldOrder - _1n2);
    return Math.ceil(bitLength / 8);
  }
  function getMinHashLength(fieldOrder) {
    const length = getFieldBytesLength(fieldOrder);
    return length + Math.ceil(length / 2);
  }
  function mapHashToField(key, fieldOrder, isLE2 = false) {
    abytes3(key);
    const len = key.length;
    const fieldLen = getFieldBytesLength(fieldOrder);
    const minLen = Math.max(getMinHashLength(fieldOrder), 16);
    if (len < minLen || len > 1024)
      throw new Error("expected " + minLen + "-1024 bytes of input, got " + len);
    const num = isLE2 ? bytesToNumberLE(key) : bytesToNumberBE(key);
    const reduced = mod(num, fieldOrder - _1n2) + _1n2;
    return isLE2 ? numberToBytesLE(reduced, fieldLen) : numberToBytesBE(reduced, fieldLen);
  }

  // node_modules/@noble/curves/abstract/curve.js
  function _classCallCheck5(a, n) {
    if (!(a instanceof n))
      throw new TypeError("Cannot call a class as a function");
  }
  function _defineProperties5(e, r) {
    for (var t = 0; t < r.length; t++) {
      var o = r[t];
      o.enumerable = o.enumerable || false, o.configurable = true, "value" in o && (o.writable = true), Object.defineProperty(e, _toPropertyKey5(o.key), o);
    }
  }
  function _createClass5(e, r, t) {
    return r && _defineProperties5(e.prototype, r), t && _defineProperties5(e, t), Object.defineProperty(e, "prototype", { writable: false }), e;
  }
  function _defineProperty5(e, r, t) {
    return (r = _toPropertyKey5(r)) in e ? Object.defineProperty(e, r, { value: t, enumerable: true, configurable: true, writable: true }) : e[r] = t, e;
  }
  function _toPropertyKey5(t) {
    var i = _toPrimitive5(t, "string");
    return "symbol" == typeof i ? i : i + "";
  }
  function _toPrimitive5(t, e) {
    if ("object" != typeof t || !t)
      return t;
    var r;
    if ("undefined" != typeof Symbol && void 0 !== (r = t[Symbol.toPrimitive])) {
      var i = r.call(t, e || "default");
      if ("object" != typeof i)
        return i;
      throw new TypeError("@@toPrimitive must return a primitive value.");
    }
    return ("string" === e ? String : Number)(t);
  }
  var _0n3 = /* @__PURE__ */ BigInt(0);
  var _1n3 = /* @__PURE__ */ BigInt(1);
  var _4n2 = /* @__PURE__ */ BigInt(4);
  var BLIND_BYTES = 16;
  var BLIND_BITS = 128;
  var FW_WINDOW = 5;
  var TABLE_BYTES_MAX = /* @__PURE__ */ (() => 2 ** 31)();
  function validatePointCons(Point) {
    const pc = Point;
    if (typeof pc !== "function")
      throw new TypeError('"Point" expected constructor, got type=' + typeof Point);
    afunction(pc.fromAffine, "Point.fromAffine");
    afunction(pc.fromBytes, "Point.fromBytes");
    afunction(pc.fromHex, "Point.fromHex");
    aobject2(pc.BASE, "Point.BASE");
    aobject2(pc.ZERO, "Point.ZERO");
    validateField(pc.Fp);
    validateField(pc.Fn);
  }
  function normalizeZ(c, points) {
    validatePointCons(c);
    validateMSMPoints(points, c);
    const invertedZs = FpInvertBatch(c.Fp, points.map((p) => p.Z));
    return points.map((p, i) => c.fromAffine(p.toAffine(invertedZs[i])));
  }
  function validateW(W, bits, min = 1) {
    if (!Number.isSafeInteger(W) || W < min || W > bits)
      throw new Error("invalid window size, expected [" + min + ".." + bits + "], got W=" + W);
  }
  function validateTableBytes(numPoints, fpBytes) {
    const bytes = numPoints * (4 * fpBytes + 128);
    if (bytes > TABLE_BYTES_MAX)
      throw new Error("invalid window size: table would need ~" + Math.ceil(bytes / 2 ** 20) + " MiB, max " + TABLE_BYTES_MAX / 2 ** 20 + " MiB");
  }
  function probeRandomBytes(randomBytes3, length) {
    if (randomBytes3 === void 0)
      return void 0;
    afunction(randomBytes3, "randomBytes");
    try {
      const probe = randomBytes3(length);
      if (!isBytes3(probe) || probe.length !== length)
        return void 0;
    } catch {
      return void 0;
    }
    return randomBytes3;
  }
  function validateMSMPoints(points, c) {
    aarray(points, "points");
    points.forEach((p, i) => {
      if (!(p instanceof c))
        throw new Error("invalid point at index " + i);
    });
  }
  function validateMSMScalars(scalars, field, maxScalar) {
    if (!Array.isArray(scalars))
      throw new Error("array of scalars expected");
    scalars.forEach((s, i) => {
      const ok = maxScalar === void 0 ? field.isValid(s) : isPosBig(s) && s < maxScalar;
      if (!ok)
        throw new Error("invalid scalar at index " + i);
    });
  }
  var pointWindowSizes = /* @__PURE__ */ new WeakMap();
  function getWindowSize(P) {
    return pointWindowSizes.get(P) || 1;
  }
  function oddMultiples(p, size) {
    const dbl = p.double();
    const t = [p];
    for (let j = 1; j < size; j++)
      t.push(t[j - 1].add(dbl));
    return t;
  }
  function wnafDigits(n, W) {
    const size = 2 ** W;
    const half = size / 2;
    const mask = BigInt(size - 1);
    const d = [];
    while (n > _0n3) {
      let w = 0;
      if (n & _1n3) {
        w = Number(n & mask);
        if (w >= half)
          w -= size;
        n -= BigInt(w);
      }
      d.push(w);
      n >>= _1n3;
    }
    return d;
  }
  function signedWindowDigits(n, W, windows) {
    const size = 2 ** W;
    const half = size / 2;
    const mask = BigInt(size - 1);
    const shiftBy = BigInt(W);
    const d = [];
    for (let w = 0; w < windows; w++) {
      let v = Number(n & mask);
      n >>= shiftBy;
      if (v > half) {
        v -= size;
        n += _1n3;
      }
      d.push(v);
    }
    if (n !== _0n3)
      throw new Error("invalid wnaf");
    return d;
  }
  function wnafWalk(zero, tables, digits) {
    let max = 0;
    for (const d of digits)
      max = Math.max(max, d.length);
    let acc = zero;
    for (let bit = max - 1; bit >= 0; bit--) {
      if (bit !== max - 1)
        acc = acc.double();
      for (let i = 0; i < digits.length; i++) {
        const w = digits[i][bit];
        if (w) {
          const item = tables[i][Math.abs(w) - 1 >> 1];
          acc = acc.add(w < 0 ? item.negate() : item);
        }
      }
    }
    return acc;
  }
  var ScalarMultiplier = /* @__PURE__ */ (function() {
    function ScalarMultiplier2(Point, randomBytes3) {
      _classCallCheck5(this, ScalarMultiplier2);
      _defineProperty5(this, "Point", void 0);
      _defineProperty5(this, "BASE", void 0);
      _defineProperty5(this, "ZERO", void 0);
      _defineProperty5(this, "randomBytes", void 0);
      _defineProperty5(this, "wnafPrecomputes", /* @__PURE__ */ new WeakMap());
      _defineProperty5(this, "baseCanBeBlinded", void 0);
      _defineProperty5(this, "bits", void 0);
      validatePointCons(Point);
      this.randomBytes = probeRandomBytes(randomBytes3, BLIND_BYTES);
      this.Point = Point;
      this.BASE = Point.BASE;
      this.ZERO = Point.ZERO;
      this.bits = Point.Fn.BITS;
    }
    return _createClass5(ScalarMultiplier2, [{
      key: "buildWnafTable",
      value: function buildWnafTable(point, W, bits) {
        const windows = Math.ceil(bits / W) + 1;
        const half = 2 ** (W - 1);
        const comp = [];
        let base2 = point;
        for (let w = 0; w < windows; w++) {
          let acc = base2;
          for (let i = 0; i < half; i++) {
            comp.push(acc);
            acc = acc.add(base2);
          }
          base2 = comp[comp.length - 1].double();
        }
        return {
          W,
          bits,
          windows,
          comp
        };
      }
      /**
       * Implements ec multiplication using precomputed signed fixed-window wNAF tables.
       * Constant-time: fixed window count with one table addition per window — zero digits feed
       * the fake accumulator — and no doublings; the lookup scans the whole window slice.
       * Scalar bounds are validated by the public entry points ({@link ScalarMultiplier.mulCT},
       * {@link ScalarMultiplier.mulCTBlinded}, {@link ScalarMultiplier.mulUnsafe});
       * signedWindowDigits throws if `n` exceeds the table.
       * @returns real and fake (for const-time) points
       */
    }, {
      key: "wnafCachedCT",
      value: function wnafCachedCT(precomputes, n) {
        const { W, windows, comp } = precomputes;
        const half = 2 ** (W - 1);
        const digits = signedWindowDigits(n, W, windows);
        let p = this.ZERO;
        let f = this.BASE;
        for (let w = 0; w < windows; w++) {
          const digit = digits[w];
          const start = w * half;
          const idx = Math.abs(digit) - 1;
          let sel = comp[start];
          for (let i = 1; i < half; i++)
            sel = i === idx ? comp[start + i] : sel;
          const neg = sel.negate();
          if (digit === 0)
            f = f.add(comp[start]);
          else
            p = p.add(digit < 0 ? neg : sel);
        }
        return {
          p,
          f
        };
      }
      // Cache key is point identity plus (W, bits); at most two entries exist per point (public-width
      // `Fn.BITS` and blinded `Fn.BITS + BLIND_BITS`). Callers must not reuse the same point with
      // incompatible `transform(...)` layouts and expect a separate cache entry.
    }, {
      key: "getWnafPrecomputes",
      value: function getWnafPrecomputes(W, point, bits, transform) {
        let entries = this.wnafPrecomputes.get(point);
        let comp = entries?.find((entry) => entry.W === W && entry.bits === bits);
        if (!comp) {
          comp = this.buildWnafTable(point, W, bits);
          if (typeof transform === "function")
            comp = {
              ...comp,
              comp: transform(comp.comp)
            };
          if (!entries) {
            entries = [];
            this.wnafPrecomputes.set(point, entries);
          }
          entries.push(comp);
        }
        return comp;
      }
    }, {
      key: "assertPoint",
      value: function assertPoint(point) {
        if (!(point instanceof this.Point))
          throw new TypeError('"point" expected Point instance, got type=' + typeof point);
      }
      // Shared prologue of the constant-time entry points. Rejects scalar 0: in key/signature-style
      // callers a zero scalar means broken upstream plumbing, and concrete Points already reject it.
      // Uses inRange instead of Fn.isValidNot0: validateField() only certifies the arithmetic subset.
    }, {
      key: "validateMulInput",
      value: function validateMulInput(point, scalar) {
        this.assertPoint(point);
        if (!inRange(scalar, _1n3, this.Point.Fn.ORDER))
          throw new Error("invalid scalar");
      }
      // Constant-time dispatch shared by mulCT / mulCTBlinded. Un-precomputed points (W===1, e.g.
      // ECDH peer keys) skip building a throwaway cached table in favor of a small fixed-window
      // multiply. `n` must be < 2^bits.
    }, {
      key: "runCT",
      value: function runCT(point, n, bits, transform) {
        const W = getWindowSize(point);
        if (W === 1)
          return this.fixedWindowCT(point, n, bits);
        return this.wnafCachedCT(this.getWnafPrecomputes(W, point, bits, transform), n);
      }
    }, {
      key: "mulCT",
      value: function mulCT(point, scalar, transform) {
        this.validateMulInput(point, scalar);
        return this.runCT(point, scalar, this.bits, transform);
      }
    }, {
      key: "mulCTBlinded",
      value: function mulCTBlinded(point, scalar, transform) {
        this.validateMulInput(point, scalar);
        if (this.randomBytes === void 0)
          throw new Error("randomBytes is required for scalar blinding");
        const bits = this.Point.Fn.BITS + BLIND_BITS;
        const blind = this.randomBytes(BLIND_BYTES);
        if (!isBytes3(blind) || blind.length !== BLIND_BYTES)
          throw new Error("randomBytes returned invalid byte array");
        blind[0] = blind[0] & 63 | 128;
        const n = scalar + bytesToNumberBE(blind) * this.Point.Fn.ORDER;
        return this.runCT(point, n, bits, transform);
      }
      /**
       * Constant-time multiplication `n*point` for an un-precomputed point, via a small fixed window.
       * A cached wNAF table only pays off when reused; a flat 2^FW_WINDOW table (`size-1` adds) is
       * far cheaper to build for a single use. The point-operation sequence is independent of `n`:
       * build the table, then per window exactly FW_WINDOW doublings, a data-oblivious scan over
       * every table entry, and one addition (adds the identity when the window digit is 0 — never
       * skipped).
       *
       * `n` must be `< 2^bits`. Assumes complete addition (adding the identity costs the same as any
       * add), which holds for the Weierstrass/Edwards point types used here. The table is left in
       * projective form (no normalizeZ): normalizing this small a table costs more than the
       * mixed-add savings it would buy for a single multiply.
       * @returns real point `p`; `f` duplicates it only to match {@link wnafCachedCT}'s return shape
       * (this path needs no fake accumulator — its op-count is already scalar-independent).
       */
    }, {
      key: "fixedWindowCT",
      value: function fixedWindowCT(point, n, bits) {
        const W = FW_WINDOW;
        const size = 1 << W;
        const mask = bitMask(W);
        const table = new Array(size);
        table[0] = this.ZERO;
        for (let i = 1; i < size; i++)
          table[i] = table[i - 1].add(point);
        const windows = Math.ceil(bits / W);
        let acc = this.ZERO;
        for (let window = windows - 1; window >= 0; window--) {
          if (window !== windows - 1)
            for (let d = 0; d < W; d++)
              acc = acc.double();
          const digit = Number(n >> BigInt(window * W) & mask);
          let sel = table[0];
          for (let i = 1; i < size; i++)
            sel = i === digit ? table[i] : sel;
          acc = acc.add(sel);
        }
        return {
          p: acc,
          f: acc
        };
      }
    }, {
      key: "shouldBlind",
      value: function shouldBlind(point, cofactor) {
        if (this.randomBytes === void 0)
          return false;
        if (cofactor === _1n3)
          return true;
        if (point !== this.BASE)
          return false;
        if (this.baseCanBeBlinded === void 0)
          this.baseCanBeBlinded = this.mulUnsafe(this.BASE, this.Point.Fn.ORDER).is0();
        return this.baseCanBeBlinded;
      }
    }, {
      key: "mulSecret",
      value: function mulSecret(point, scalar, cofactor, transform) {
        return this.shouldBlind(point, cofactor) ? this.mulCTBlinded(point, scalar, transform) : this.mulCT(point, scalar, transform);
      }
    }, {
      key: "mulUnsafe",
      value: function mulUnsafe(point, scalar, transform) {
        this.assertPoint(point);
        if (!isPosBig(scalar))
          throw new Error("invalid scalar");
        const W = getWindowSize(point);
        if (W === 1 || scalar >= this.Point.Fn.ORDER)
          return mulAddUnsafe(this.Point, [point], [scalar], true);
        const precomputes = this.getWnafPrecomputes(W, point, this.bits, transform);
        return this.wnafCachedCT(precomputes, scalar).p;
      }
      // Remembers the window size used for precomputed wNAF multiplication of the given point
      // and drops any previously built tables. Usually only the base point is precomputed.
      // W=1 resets the point to the un-precomputed (table-less) paths.
      // W is additionally capped so tables stay under ~2 GiB ({@link TABLE_BYTES_MAX}).
    }, {
      key: "setWindowSize",
      value: function setWindowSize(point, W) {
        this.assertPoint(point);
        validateW(W, this.bits);
        const windows = Math.ceil((this.bits + BLIND_BITS) / W) + 1;
        validateTableBytes(windows * 2 ** (W - 1), this.Point.Fp.BYTES);
        pointWindowSizes.set(point, W);
        this.wnafPrecomputes.delete(point);
      }
      // True when a window size is set: tables themselves are built lazily on first multiply.
    }, {
      key: "hasWindowSize",
      value: function hasWindowSize(point) {
        return getWindowSize(point) !== 1;
      }
    }]);
  })();
  function mulAddUnsafe(c, points, scalars, allowOversized = false) {
    validatePointCons(c);
    validateMSMPoints(points, c);
    abool2(allowOversized, "allowOversized");
    validateMSMScalars(scalars, c.Fn, allowOversized ? c.Fn.ORDER ** _4n2 : void 0);
    if (points.length !== scalars.length)
      throw new Error("arrays of points and scalars must have equal length");
    const tables = points.map((p) => oddMultiples(p, 4));
    const digits = scalars.map((n) => wnafDigits(n, 4));
    return wnafWalk(c.ZERO, tables, digits);
  }
  function createField(order, field, isLE2) {
    if (field) {
      if (field.ORDER !== order)
        throw new Error("Field.ORDER must match order: Fp == p, Fn == n");
      validateField(field);
      return field;
    } else {
      return Field(order, {
        isLE: isLE2
      });
    }
  }
  function createCurveFields(type, CURVE, curveOpts = {}, FpFnLE) {
    if (type !== "weierstrass" && type !== "edwards")
      throw new Error('expected curve type "weierstrass" or "edwards"');
    if (FpFnLE === void 0)
      FpFnLE = type === "edwards";
    if (!CURVE || typeof CURVE !== "object")
      throw new Error(`expected valid ${type} CURVE object`);
    validateObject(curveOpts);
    for (const p of ["p", "n", "h"]) {
      const val = CURVE[p];
      if (!(isPosBig(val) && val !== _0n3))
        throw new Error(`CURVE.${p} must be positive bigint`);
    }
    const Fp = createField(CURVE.p, curveOpts.Fp, FpFnLE);
    const Fn = createField(CURVE.n, curveOpts.Fn, FpFnLE);
    const _b = type === "weierstrass" ? "b" : "d";
    const params = ["Gx", "Gy", "a", _b];
    for (const p of params) {
      if (!Fp.isValid(CURVE[p]))
        throw new Error(`CURVE.${p} must be valid field element of CURVE.Fp`);
    }
    CURVE = Object.freeze(Object.assign({}, CURVE));
    return {
      CURVE,
      Fp,
      Fn
    };
  }
  function createKeygen(randomSecretKey, getPublicKey) {
    return function keygen(seed) {
      const secretKey = randomSecretKey(seed);
      return {
        secretKey,
        publicKey: getPublicKey(secretKey)
      };
    };
  }

  // node_modules/@noble/hashes/hmac.js
  function _classCallCheck6(a, n) {
    if (!(a instanceof n))
      throw new TypeError("Cannot call a class as a function");
  }
  function _defineProperties6(e, r) {
    for (var t = 0; t < r.length; t++) {
      var o = r[t];
      o.enumerable = o.enumerable || false, o.configurable = true, "value" in o && (o.writable = true), Object.defineProperty(e, _toPropertyKey6(o.key), o);
    }
  }
  function _createClass6(e, r, t) {
    return r && _defineProperties6(e.prototype, r), t && _defineProperties6(e, t), Object.defineProperty(e, "prototype", { writable: false }), e;
  }
  function _defineProperty6(e, r, t) {
    return (r = _toPropertyKey6(r)) in e ? Object.defineProperty(e, r, { value: t, enumerable: true, configurable: true, writable: true }) : e[r] = t, e;
  }
  function _toPropertyKey6(t) {
    var i = _toPrimitive6(t, "string");
    return "symbol" == typeof i ? i : i + "";
  }
  function _toPrimitive6(t, e) {
    if ("object" != typeof t || !t)
      return t;
    var r;
    if ("undefined" != typeof Symbol && void 0 !== (r = t[Symbol.toPrimitive])) {
      var i = r.call(t, e || "default");
      if ("object" != typeof i)
        return i;
      throw new TypeError("@@toPrimitive must return a primitive value.");
    }
    return ("string" === e ? String : Number)(t);
  }
  var _HMAC = /* @__PURE__ */ (function() {
    function _HMAC2(hash, key) {
      _classCallCheck6(this, _HMAC2);
      _defineProperty6(this, "oHash", void 0);
      _defineProperty6(this, "iHash", void 0);
      _defineProperty6(this, "blockLen", void 0);
      _defineProperty6(this, "outputLen", void 0);
      _defineProperty6(this, "canXOF", false);
      _defineProperty6(this, "finished", false);
      _defineProperty6(this, "destroyed", false);
      ahash(hash);
      abytes2(key, void 0, "key");
      this.iHash = hash.create();
      if (typeof this.iHash.update !== "function")
        throw new Error("expected Hash instance");
      this.blockLen = this.iHash.blockLen;
      this.outputLen = this.iHash.outputLen;
      const blockLen = this.blockLen;
      const pad = new Uint8Array(blockLen);
      pad.set(key.length > blockLen ? hash.create().update(key).digest() : key);
      for (let i = 0; i < pad.length; i++)
        pad[i] ^= 54;
      this.iHash.update(pad);
      this.oHash = hash.create();
      for (let i = 0; i < pad.length; i++)
        pad[i] ^= 54 ^ 92;
      this.oHash.update(pad);
      clean2(pad);
    }
    return _createClass6(_HMAC2, [{
      key: "update",
      value: function update(buf) {
        aexists2(this);
        this.iHash.update(buf);
        return this;
      }
    }, {
      key: "digestInto",
      value: function digestInto(out) {
        aexists2(this);
        aoutput2(out, this);
        this.finished = true;
        const buf = out.subarray(0, this.outputLen);
        this.iHash.digestInto(buf);
        this.oHash.update(buf);
        this.oHash.digestInto(buf);
        this.destroy();
      }
    }, {
      key: "digest",
      value: function digest2() {
        const out = new Uint8Array(this.oHash.outputLen);
        this.digestInto(out);
        return out;
      }
    }, {
      key: "_cloneInto",
      value: function _cloneInto(to) {
        to ||= Object.create(Object.getPrototypeOf(this), {});
        const { oHash, iHash, finished, destroyed, blockLen, outputLen, canXOF } = this;
        to = to;
        to.finished = finished;
        to.destroyed = destroyed;
        to.blockLen = blockLen;
        to.outputLen = outputLen;
        to.canXOF = canXOF;
        to.oHash = oHash._cloneInto(to.oHash);
        to.iHash = iHash._cloneInto(to.iHash);
        return to;
      }
    }, {
      key: "clone",
      value: function clone() {
        return this._cloneInto();
      }
    }, {
      key: "destroy",
      value: function destroy() {
        this.destroyed = true;
        this.oHash.destroy();
        this.iHash.destroy();
      }
    }]);
  })();
  var hmac = /* @__PURE__ */ (() => {
    const hmac_ = (hash, key, message) => new _HMAC(hash, key).update(message).digest();
    hmac_.create = (hash, key) => new _HMAC(hash, key);
    return hmac_;
  })();

  // node_modules/@noble/curves/abstract/der.js
  function _defineProperties7(e, r) {
    for (var t = 0; t < r.length; t++) {
      var o = r[t];
      o.enumerable = o.enumerable || false, o.configurable = true, "value" in o && (o.writable = true), Object.defineProperty(e, _toPropertyKey7(o.key), o);
    }
  }
  function _createClass7(e, r, t) {
    return r && _defineProperties7(e.prototype, r), t && _defineProperties7(e, t), Object.defineProperty(e, "prototype", { writable: false }), e;
  }
  function _toPropertyKey7(t) {
    var i = _toPrimitive7(t, "string");
    return "symbol" == typeof i ? i : i + "";
  }
  function _toPrimitive7(t, e) {
    if ("object" != typeof t || !t)
      return t;
    var r;
    if ("undefined" != typeof Symbol && void 0 !== (r = t[Symbol.toPrimitive])) {
      var i = r.call(t, e || "default");
      if ("object" != typeof i)
        return i;
      throw new TypeError("@@toPrimitive must return a primitive value.");
    }
    return ("string" === e ? String : Number)(t);
  }
  function _classCallCheck7(a, n) {
    if (!(a instanceof n))
      throw new TypeError("Cannot call a class as a function");
  }
  function _callSuper2(t, o, e) {
    return o = _getPrototypeOf2(o), _possibleConstructorReturn2(t, _isNativeReflectConstruct2() ? Reflect.construct(o, e || [], _getPrototypeOf2(t).constructor) : o.apply(t, e));
  }
  function _possibleConstructorReturn2(t, e) {
    if (e && ("object" == typeof e || "function" == typeof e))
      return e;
    if (void 0 !== e)
      throw new TypeError("Derived constructors may only return object or undefined");
    return _assertThisInitialized2(t);
  }
  function _assertThisInitialized2(e) {
    if (void 0 === e)
      throw new ReferenceError("this hasn't been initialised - super() hasn't been called");
    return e;
  }
  function _inherits2(t, e) {
    if ("function" != typeof e && null !== e)
      throw new TypeError("Super expression must either be null or a function");
    t.prototype = Object.create(e && e.prototype, { constructor: { value: t, writable: true, configurable: true } }), Object.defineProperty(t, "prototype", { writable: false }), e && _setPrototypeOf2(t, e);
  }
  function _wrapNativeSuper(t) {
    var r = "function" == typeof Map ? /* @__PURE__ */ new Map() : void 0;
    return _wrapNativeSuper = function(t2) {
      if (null === t2 || !_isNativeFunction(t2))
        return t2;
      if ("function" != typeof t2)
        throw new TypeError("Super expression must either be null or a function");
      if (void 0 !== r) {
        if (r.has(t2))
          return r.get(t2);
        r.set(t2, Wrapper);
      }
      function Wrapper() {
        return _construct(t2, arguments, _getPrototypeOf2(this).constructor);
      }
      return Wrapper.prototype = Object.create(t2.prototype, { constructor: { value: Wrapper, enumerable: false, writable: true, configurable: true } }), _setPrototypeOf2(Wrapper, t2);
    }, _wrapNativeSuper(t);
  }
  function _construct(t, e, r) {
    if (_isNativeReflectConstruct2())
      return Reflect.construct.apply(null, arguments);
    var o = [null];
    o.push.apply(o, e);
    var p = new (t.bind.apply(t, o))();
    return r && _setPrototypeOf2(p, r.prototype), p;
  }
  function _isNativeReflectConstruct2() {
    try {
      var t = !Boolean.prototype.valueOf.call(Reflect.construct(Boolean, [], function() {
      }));
    } catch (t2) {
    }
    return (_isNativeReflectConstruct2 = function() {
      return !!t;
    })();
  }
  function _isNativeFunction(t) {
    try {
      return -1 !== Function.toString.call(t).indexOf("[native code]");
    } catch (n) {
      return "function" == typeof t;
    }
  }
  function _setPrototypeOf2(t, e) {
    return _setPrototypeOf2 = Object.setPrototypeOf ? Object.setPrototypeOf.bind() : function(t2, e2) {
      return t2.__proto__ = e2, t2;
    }, _setPrototypeOf2(t, e);
  }
  function _getPrototypeOf2(t) {
    return _getPrototypeOf2 = Object.setPrototypeOf ? Object.getPrototypeOf.bind() : function(t2) {
      return t2.__proto__ || Object.getPrototypeOf(t2);
    }, _getPrototypeOf2(t);
  }
  var _0n4 = /* @__PURE__ */ BigInt(0);
  var DERErr = /* @__PURE__ */ (function(_Error) {
    function DERErr2(m = "") {
      _classCallCheck7(this, DERErr2);
      return _callSuper2(this, DERErr2, [m]);
    }
    _inherits2(DERErr2, _Error);
    return _createClass7(DERErr2);
  })(/* @__PURE__ */ _wrapNativeSuper(Error));
  var _DER = {
    // asn.1 DER encoding utils
    Err: DERErr,
    // Basic building block is TLV (Tag-Length-Value)
    _tlv: {
      encode: (tag, data) => {
        const { Err: E } = _DER;
        asafenumber(tag, "tag");
        if (tag < 0 || tag > 255)
          throw new E("tlv.encode: wrong tag");
        astring(data, "data");
        if (data.length & 1)
          throw new E("tlv.encode: unpadded data");
        const dataLen = data.length / 2;
        const len = numberToHexUnpadded(dataLen);
        if (len.length / 2 & 128)
          throw new E("tlv.encode: long form length too big");
        const lenLen = dataLen > 127 ? numberToHexUnpadded(len.length / 2 | 128) : "";
        const t = numberToHexUnpadded(tag);
        return t + lenLen + len + data;
      },
      // v - value, l - left bytes (unparsed)
      decode(tag, data) {
        const { Err: E } = _DER;
        data = abytes3(data, void 0, "DER data");
        let pos = 0;
        if (tag < 0 || tag > 255)
          throw new E("tlv.decode: wrong tag");
        if (data.length < 2 || data[pos++] !== tag)
          throw new E("tlv.decode: wrong tlv");
        const first = data[pos++];
        const isLong = !!(first & 128);
        let length = 0;
        if (!isLong)
          length = first;
        else {
          const lenLen = first & 127;
          if (!lenLen)
            throw new E("tlv.decode(long): indefinite length not supported");
          if (lenLen > 4)
            throw new E("tlv.decode(long): byte length is too big");
          const lengthBytes = data.subarray(pos, pos + lenLen);
          if (lengthBytes.length !== lenLen)
            throw new E("tlv.decode: length bytes not complete");
          if (lengthBytes[0] === 0)
            throw new E("tlv.decode(long): zero leftmost byte");
          for (const b of lengthBytes)
            length = length << 8 | b;
          pos += lenLen;
          if (length < 128)
            throw new E("tlv.decode(long): not minimal encoding");
        }
        const v = data.subarray(pos, pos + length);
        if (v.length !== length)
          throw new E("tlv.decode: wrong value length");
        return {
          v,
          l: data.subarray(pos + length)
        };
      }
    },
    // https://crypto.stackexchange.com/a/57734 Leftmost bit of first byte is 'negative' flag,
    // since we always use positive integers here. It must always be empty:
    // - add zero byte if exists
    // - if next byte doesn't have a flag, leading zero is not allowed (minimal encoding)
    _int: {
      encode(num) {
        const { Err: E } = _DER;
        abignumber(num);
        if (num < _0n4)
          throw new E("integer: negative integers are not allowed");
        let hex = numberToHexUnpadded(num);
        if (Number.parseInt(hex[0], 16) & 8)
          hex = "00" + hex;
        if (hex.length & 1)
          throw new E("unexpected DER parsing assertion: unpadded hex");
        return hex;
      },
      decode(data) {
        const { Err: E } = _DER;
        if (data.length < 1)
          throw new E("invalid signature integer: empty");
        if (data[0] & 128)
          throw new E("invalid signature integer: negative");
        if (data.length > 1 && data[0] === 0 && !(data[1] & 128))
          throw new E("invalid signature integer: unnecessary leading zero");
        return bytesToNumberBE(data);
      }
    },
    toSig(bytes, maxScalarBytes) {
      const { Err: E, _int: int, _tlv: tlv } = _DER;
      if (maxScalarBytes !== void 0) {
        asafenumber(maxScalarBytes, "maxScalarBytes");
        if (maxScalarBytes < 1)
          throw new E("invalid signature: maxScalarBytes must be positive");
      }
      const data = abytes3(bytes, void 0, "signature");
      const { v: seqBytes, l: seqLeftBytes } = tlv.decode(48, data);
      if (seqLeftBytes.length)
        throw new E("invalid signature: left bytes after parsing");
      const { v: rBytes, l: rLeftBytes } = tlv.decode(2, seqBytes);
      const { v: sBytes, l: sLeftBytes } = tlv.decode(2, rLeftBytes);
      if (sLeftBytes.length)
        throw new E("invalid signature: left bytes after parsing");
      if (maxScalarBytes !== void 0 && (rBytes.length > maxScalarBytes || sBytes.length > maxScalarBytes))
        throw new E("invalid signature: integer too large");
      return {
        r: int.decode(rBytes),
        s: int.decode(sBytes)
      };
    },
    hexFromSig(sig) {
      const { _tlv: tlv, _int: int } = _DER;
      validateObject(sig, {
        r: "bigint",
        s: "bigint"
      }, {}, "sig");
      const rs = tlv.encode(2, int.encode(sig.r));
      const ss = tlv.encode(2, int.encode(sig.s));
      const seq = rs + ss;
      return tlv.encode(48, seq);
    }
  };
  var DER = /* @__PURE__ */ (() => {
    Object.freeze(_DER._tlv);
    Object.freeze(_DER._int);
    return Object.freeze(_DER);
  })();

  // node_modules/@noble/curves/abstract/weierstrass.js
  function _classCallCheck8(a, n) {
    if (!(a instanceof n))
      throw new TypeError("Cannot call a class as a function");
  }
  function _defineProperties8(e, r) {
    for (var t = 0; t < r.length; t++) {
      var o = r[t];
      o.enumerable = o.enumerable || false, o.configurable = true, "value" in o && (o.writable = true), Object.defineProperty(e, _toPropertyKey8(o.key), o);
    }
  }
  function _createClass8(e, r, t) {
    return r && _defineProperties8(e.prototype, r), t && _defineProperties8(e, t), Object.defineProperty(e, "prototype", { writable: false }), e;
  }
  function _defineProperty7(e, r, t) {
    return (r = _toPropertyKey8(r)) in e ? Object.defineProperty(e, r, { value: t, enumerable: true, configurable: true, writable: true }) : e[r] = t, e;
  }
  function _toPropertyKey8(t) {
    var i = _toPrimitive8(t, "string");
    return "symbol" == typeof i ? i : i + "";
  }
  function _toPrimitive8(t, e) {
    if ("object" != typeof t || !t)
      return t;
    var r;
    if ("undefined" != typeof Symbol && void 0 !== (r = t[Symbol.toPrimitive])) {
      var i = r.call(t, e || "default");
      if ("object" != typeof i)
        return i;
      throw new TypeError("@@toPrimitive must return a primitive value.");
    }
    return ("string" === e ? String : Number)(t);
  }
  var divNearest = (num, den) => (num + (num >= 0 ? den : -den) / _2n2) / den;
  function _splitEndoScalar(k, basis, n) {
    aInRange("scalar", k, _0n5, n);
    const [[a1, b1], [a2, b2]] = basis;
    const c1 = divNearest(b2 * k, n);
    const c2 = divNearest(-b1 * k, n);
    let k1 = k - c1 * a1 - c2 * a2;
    let k2 = -c1 * b1 - c2 * b2;
    const k1neg = k1 < _0n5;
    const k2neg = k2 < _0n5;
    if (k1neg)
      k1 = -k1;
    if (k2neg)
      k2 = -k2;
    const MAX_NUM = bitMask(Math.ceil(bitLen(n) / 2)) + _1n4;
    if (k1 < _0n5 || k1 >= MAX_NUM || k2 < _0n5 || k2 >= MAX_NUM) {
      throw new Error("splitScalar (endomorphism): failed for k");
    }
    return {
      k1neg,
      k1,
      k2neg,
      k2
    };
  }
  function validateSigFormat(format) {
    if (!["compact", "recovered", "der"].includes(format))
      throw new Error('Signature format must be "compact", "recovered", or "der"');
    return format;
  }
  function validateSigOpts(opts, def) {
    validateObject(opts);
    const optsn = {};
    for (let optName of Object.keys(def)) {
      optsn[optName] = opts[optName] === void 0 ? def[optName] : opts[optName];
    }
    abool2(optsn.lowS, "lowS");
    abool2(optsn.prehash, "prehash");
    if (optsn.format !== void 0)
      validateSigFormat(optsn.format);
    return optsn;
  }
  var _0n5 = /* @__PURE__ */ BigInt(0);
  var _1n4 = /* @__PURE__ */ BigInt(1);
  var _2n2 = /* @__PURE__ */ BigInt(2);
  var _3n2 = /* @__PURE__ */ BigInt(3);
  var _4n3 = /* @__PURE__ */ BigInt(4);
  function weierstrass(params, extraOpts = {}) {
    var _Point;
    const validated = createCurveFields("weierstrass", params, extraOpts);
    const Fp = validated.Fp;
    const Fn = validated.Fn;
    let _CURVE = validated.CURVE;
    const { h: cofactor, n: CURVE_ORDER } = _CURVE;
    validateObject(extraOpts, {}, {
      allowInfinityPoint: "boolean",
      clearCofactor: "function",
      isTorsionFree: "function",
      fromBytes: "function",
      toBytes: "function",
      endo: "object",
      randomBytes: "function"
    });
    const { endo: endoOpts, allowInfinityPoint, clearCofactor: _clearCofactor, isTorsionFree: _isTorsionFree, fromBytes, toBytes } = extraOpts;
    const randomBytes3 = extraOpts.randomBytes === void 0 ? randomBytes2 : extraOpts.randomBytes;
    if (endoOpts) {
      if (!Fp.is0(_CURVE.a) || typeof endoOpts.beta !== "bigint" || !Array.isArray(endoOpts.basises)) {
        throw new Error('invalid endo: expected "beta": bigint and "basises": array');
      }
    }
    const endo = endoOpts ? {
      beta: endoOpts.beta,
      basises: endoOpts.basises.map((basis) => [...basis])
    } : void 0;
    const lengths = getWLengths(Fp, Fn);
    function assertCompressionIsSupported() {
      if (!Fp.isOdd)
        throw new Error("compression is not supported: Field does not have .isOdd()");
    }
    function pointToBytes(_c, point, isCompressed) {
      if (point.is0()) {
        if (!allowInfinityPoint)
          throw new Error("bad point: ZERO");
        return Uint8Array.of(0);
      }
      const { x, y } = point.toAffine();
      const bx = Fp.toBytes(x);
      abool2(isCompressed, "isCompressed");
      if (isCompressed) {
        assertCompressionIsSupported();
        const hasEvenY = !Fp.isOdd(y);
        return concatBytes3(pprefix(hasEvenY), bx);
      } else {
        return concatBytes3(Uint8Array.of(4), bx, Fp.toBytes(y));
      }
    }
    function pointFromBytes(bytes) {
      abytes3(bytes, void 0, "Point");
      const { publicKey: comp, publicKeyUncompressed: uncomp } = lengths;
      const length = bytes.length;
      const head = bytes[0];
      const tail = bytes.subarray(1);
      if (allowInfinityPoint && length === 1 && head === 0)
        return {
          x: Fp.ZERO,
          y: Fp.ZERO
        };
      if (length === comp && (head === 2 || head === 3)) {
        const x = Fp.fromBytes(tail);
        if (!Fp.isValid(x))
          throw new Error("bad point: is not on curve, wrong x");
        const y2 = weierstrassEquation(x);
        let y;
        try {
          y = Fp.sqrt(y2);
        } catch (sqrtError) {
          const err = sqrtError instanceof Error ? ": " + sqrtError.message : "";
          throw new Error("bad point: is not on curve, sqrt error" + err);
        }
        assertCompressionIsSupported();
        const evenY = Fp.isOdd(y);
        const evenH = (head & 1) === 1;
        if (evenH !== evenY)
          y = Fp.neg(y);
        return {
          x,
          y
        };
      } else if (length === uncomp && head === 4) {
        const L = Fp.BYTES;
        const x = Fp.fromBytes(tail.subarray(0, L));
        const y = Fp.fromBytes(tail.subarray(L, L * 2));
        if (!isValidXY(x, y))
          throw new Error("bad point: is not on curve");
        return {
          x,
          y
        };
      } else {
        throw new Error(`bad point: got length ${length}, expected compressed=${comp} or uncompressed=${uncomp}`);
      }
    }
    const encodePoint = toBytes === void 0 ? pointToBytes : toBytes;
    const decodePoint = fromBytes === void 0 ? pointFromBytes : fromBytes;
    const b3 = Fp.mul(_CURVE.b, _3n2);
    const mulA = Fp.is0(_CURVE.a) ? (_) => Fp.ZERO : (x) => Fp.mul(_CURVE.a, x);
    function weierstrassEquation(x) {
      const x2 = Fp.sqr(x);
      const x3 = Fp.mul(x2, x);
      return Fp.add(Fp.add(x3, Fp.mul(x, _CURVE.a)), _CURVE.b);
    }
    function isValidXY(x, y) {
      const left = Fp.sqr(y);
      const right = weierstrassEquation(x);
      return Fp.eql(left, right);
    }
    if (!isValidXY(_CURVE.Gx, _CURVE.Gy))
      throw new Error("bad curve params: generator point");
    const _4a3 = Fp.mul(Fp.pow(_CURVE.a, _3n2), _4n3);
    const _27b2 = Fp.mul(Fp.sqr(_CURVE.b), BigInt(27));
    if (Fp.is0(Fp.add(_4a3, _27b2)))
      throw new Error("bad curve params: a or b");
    function acoord(title, n, banZero = false) {
      if (!Fp.isValid(n) || banZero && Fp.is0(n))
        throw new Error(`bad point coordinate ${title}`);
      return typeof n === "object" && n !== null ? Fp.create(n) : n;
    }
    function aprjpoint(other) {
      if (!(other instanceof Point))
        throw new Error("Weierstrass Point expected");
    }
    function splitEndoScalarN(k) {
      if (!endo || !endo.basises)
        throw new Error("no endo");
      return _splitEndoScalar(k, endo.basises, Fn.ORDER);
    }
    function pushWnafPair(points, scalars, p, k) {
      if (!Fn.isValid(k))
        throw new RangeError("invalid scalar: out of range");
      if (endo) {
        const { k1neg, k1, k2neg, k2 } = splitEndoScalarN(k);
        const psi = new Point(Fp.mul(p.X, endo.beta), p.Y, p.Z);
        points.push(k1neg ? p.negate() : p, k2neg ? psi.negate() : psi);
        scalars.push(k1, k2);
      } else {
        points.push(p);
        scalars.push(k);
      }
    }
    const validityCache = /* @__PURE__ */ new WeakSet();
    let Point = /* @__PURE__ */ (function() {
      function Point2(X, Y, Z) {
        _classCallCheck8(this, Point2);
        _defineProperty7(this, "X", void 0);
        _defineProperty7(this, "Y", void 0);
        _defineProperty7(this, "Z", void 0);
        this.X = acoord("x", X);
        this.Y = acoord("y", Y, true);
        this.Z = acoord("z", Z);
        Object.freeze(this);
      }
      return _createClass8(Point2, [{
        key: "x",
        get: function() {
          return this.toAffine().x;
        }
      }, {
        key: "y",
        get: function() {
          return this.toAffine().y;
        }
        /**
         * @param isLazy - true will defer table computation until the first multiplication
         */
      }, {
        key: "precompute",
        value: function precompute(windowSize = 6, isLazy = true) {
          wnaf.setWindowSize(this, windowSize);
          if (!isLazy)
            this.multiply(_3n2);
          return this;
        }
        // TODO: return `this`
        /** A point on curve is valid if it conforms to equation. */
      }, {
        key: "assertValidity",
        value: function assertValidity() {
          const p = this;
          if (p.is0()) {
            if (allowInfinityPoint && Fp.is0(p.X) && Fp.eql(p.Y, Fp.ONE) && Fp.is0(p.Z))
              return;
            throw new Error("bad point: ZERO");
          }
          if (validityCache.has(p))
            return;
          const { x, y } = p.toAffine();
          if (!Fp.isValid(x) || !Fp.isValid(y))
            throw new Error("bad point: x or y not field elements");
          if (!isValidXY(x, y))
            throw new Error("bad point: equation left != right");
          if (!p.isTorsionFree())
            throw new Error("bad point: not in prime-order subgroup");
          validityCache.add(p);
        }
      }, {
        key: "hasEvenY",
        value: function hasEvenY() {
          const { y } = this.toAffine();
          if (!Fp.isOdd)
            throw new Error("Field doesn't support isOdd");
          return !Fp.isOdd(y);
        }
        /** Compare one point to another. */
      }, {
        key: "equals",
        value: function equals(other) {
          aprjpoint(other);
          const { X: X1, Y: Y1, Z: Z1 } = this;
          const { X: X2, Y: Y2, Z: Z2 } = other;
          const U1 = Fp.eql(Fp.mul(X1, Z2), Fp.mul(X2, Z1));
          const U2 = Fp.eql(Fp.mul(Y1, Z2), Fp.mul(Y2, Z1));
          return U1 && U2;
        }
        /** Flips point to one corresponding to (x, -y) in Affine coordinates. */
      }, {
        key: "negate",
        value: function negate() {
          return new Point2(this.X, Fp.neg(this.Y), this.Z);
        }
        // Renes-Costello-Batina exception-free doubling formula.
        // There is 30% faster Jacobian formula, but it is not complete.
        // https://eprint.iacr.org/2015/1060, algorithm 3
        // Cost: 8M + 3S + 3*a + 2*b3 + 15add.
      }, {
        key: "double",
        value: function double() {
          const { X: X1, Y: Y1, Z: Z1 } = this;
          let X3 = Fp.ZERO, Y3 = Fp.ZERO, Z3 = Fp.ZERO;
          let t0 = Fp.mul(X1, X1);
          let t1 = Fp.mul(Y1, Y1);
          let t2 = Fp.mul(Z1, Z1);
          let t3 = Fp.mul(X1, Y1);
          t3 = Fp.add(t3, t3);
          Z3 = Fp.mul(X1, Z1);
          Z3 = Fp.add(Z3, Z3);
          X3 = mulA(Z3);
          Y3 = Fp.mul(b3, t2);
          Y3 = Fp.add(X3, Y3);
          X3 = Fp.sub(t1, Y3);
          Y3 = Fp.add(t1, Y3);
          Y3 = Fp.mul(X3, Y3);
          X3 = Fp.mul(t3, X3);
          Z3 = Fp.mul(b3, Z3);
          t2 = mulA(t2);
          t3 = Fp.sub(t0, t2);
          t3 = mulA(t3);
          t3 = Fp.add(t3, Z3);
          Z3 = Fp.add(t0, t0);
          t0 = Fp.add(Z3, t0);
          t0 = Fp.add(t0, t2);
          t0 = Fp.mul(t0, t3);
          Y3 = Fp.add(Y3, t0);
          t2 = Fp.mul(Y1, Z1);
          t2 = Fp.add(t2, t2);
          t0 = Fp.mul(t2, t3);
          X3 = Fp.sub(X3, t0);
          Z3 = Fp.mul(t2, t1);
          Z3 = Fp.add(Z3, Z3);
          Z3 = Fp.add(Z3, Z3);
          return new Point2(X3, Y3, Z3);
        }
        // Renes-Costello-Batina exception-free addition formula.
        // There is 30% faster Jacobian formula, but it is not complete.
        // https://eprint.iacr.org/2015/1060, algorithm 1
        // Cost: 12M + 0S + 3*a + 3*b3 + 23add.
      }, {
        key: "add",
        value: function add(other) {
          aprjpoint(other);
          const { X: X1, Y: Y1, Z: Z1 } = this;
          const { X: X2, Y: Y2, Z: Z2 } = other;
          let X3 = Fp.ZERO, Y3 = Fp.ZERO, Z3 = Fp.ZERO;
          let t0 = Fp.mul(X1, X2);
          let t1 = Fp.mul(Y1, Y2);
          let t2 = Fp.mul(Z1, Z2);
          let t3 = Fp.add(X1, Y1);
          let t4 = Fp.add(X2, Y2);
          t3 = Fp.mul(t3, t4);
          t4 = Fp.add(t0, t1);
          t3 = Fp.sub(t3, t4);
          t4 = Fp.add(X1, Z1);
          let t5 = Fp.add(X2, Z2);
          t4 = Fp.mul(t4, t5);
          t5 = Fp.add(t0, t2);
          t4 = Fp.sub(t4, t5);
          t5 = Fp.add(Y1, Z1);
          X3 = Fp.add(Y2, Z2);
          t5 = Fp.mul(t5, X3);
          X3 = Fp.add(t1, t2);
          t5 = Fp.sub(t5, X3);
          Z3 = mulA(t4);
          X3 = Fp.mul(b3, t2);
          Z3 = Fp.add(X3, Z3);
          X3 = Fp.sub(t1, Z3);
          Z3 = Fp.add(t1, Z3);
          Y3 = Fp.mul(X3, Z3);
          t1 = Fp.add(t0, t0);
          t1 = Fp.add(t1, t0);
          t2 = mulA(t2);
          t4 = Fp.mul(b3, t4);
          t1 = Fp.add(t1, t2);
          t2 = Fp.sub(t0, t2);
          t2 = mulA(t2);
          t4 = Fp.add(t4, t2);
          t0 = Fp.mul(t1, t4);
          Y3 = Fp.add(Y3, t0);
          t0 = Fp.mul(t5, t4);
          X3 = Fp.mul(t3, X3);
          X3 = Fp.sub(X3, t0);
          t0 = Fp.mul(t3, t1);
          Z3 = Fp.mul(t5, Z3);
          Z3 = Fp.add(Z3, t0);
          return new Point2(X3, Y3, Z3);
        }
      }, {
        key: "subtract",
        value: function subtract(other) {
          aprjpoint(other);
          return this.add(other.negate());
        }
      }, {
        key: "is0",
        value: function is0() {
          return this.equals(Point2.ZERO);
        }
        /**
         * Constant time multiplication.
         * Uses precomputed tables (signed fixed-window wNAF) when available.
         * Uses scalar blinding and avoids endomorphism splitting in the secret-scalar path.
         * @param scalar - by which the point would be multiplied
         * @returns New point
         */
      }, {
        key: "multiply",
        value: function multiply(scalar) {
          if (!Fn.isValidNot0(scalar))
            throw new RangeError("invalid scalar: out of range");
          const { p, f } = wnaf.mulSecret(this, scalar, cofactor, normalize);
          return normalize([p, f])[0];
        }
        /**
         * Non-constant-time multiplication. Uses width-4 wNAF with GLV endomorphism splitting
         * when available (two half-width scalars sharing one halved doubling chain).
         * It's faster, but should only be used when you don't care about
         * an exposed secret key e.g. sig verification, which works over *public* keys.
         */
      }, {
        key: "multiplyUnsafe",
        value: function multiplyUnsafe(scalar) {
          const p = this;
          const sc = scalar;
          if (!Fn.isValid(sc))
            throw new RangeError("invalid scalar: out of range");
          if (sc === _0n5 || p.is0())
            return Point2.ZERO;
          if (sc === _1n4)
            return p;
          if (wnaf.hasWindowSize(this))
            return wnaf.mulUnsafe(p, sc, normalize);
          const points = [];
          const scalars = [];
          pushWnafPair(points, scalars, p, sc);
          return mulAddUnsafe(Point2, points, scalars);
        }
        /**
         * Non-constant-time double-scalar multiplication `a⋅this + b⋅other` (Strauss–Shamir).
         * Both walks share one doubling chain via {@link mulAddUnsafe}, and GLV endomorphism
         * (when available) halves the chain again by splitting each scalar into two half-width
         * parts. Used by ECDSA verification and public-key recovery for `R = u1⋅G + u2⋅P`.
         * Only for public scalars.
         */
      }, {
        key: "mulAddUnsafe",
        value: function mulAddUnsafe2(a, other, b) {
          aprjpoint(other);
          const points = [];
          const scalars = [];
          pushWnafPair(points, scalars, this, a);
          pushWnafPair(points, scalars, other, b);
          return mulAddUnsafe(Point2, points, scalars);
        }
        /**
         * Converts Projective point to affine (x, y) coordinates.
         * (X, Y, Z) ∋ (x=X/Z, y=Y/Z).
         * @param invertedZ - Z^-1 (inverted zero) - optional, precomputation is useful for invertBatch
         */
      }, {
        key: "toAffine",
        value: function toAffine(invertedZ) {
          const p = this;
          let iz = invertedZ;
          if (iz != null && !Fp.isValid(iz))
            throw new RangeError('"invertedZ" expected valid field element');
          const { X, Y, Z } = p;
          if (Fp.eql(Z, Fp.ONE))
            return {
              x: X,
              y: Y
            };
          const is0 = p.is0();
          if (iz == null)
            iz = is0 ? Fp.ONE : Fp.inv(Z);
          const x = Fp.mul(X, iz);
          const y = Fp.mul(Y, iz);
          const zz = Fp.mul(Z, iz);
          if (is0)
            return {
              x: Fp.ZERO,
              y: Fp.ZERO
            };
          if (!Fp.eql(zz, Fp.ONE))
            throw new Error("invZ was invalid");
          return {
            x,
            y
          };
        }
        /**
         * Checks whether Point is free of torsion elements (is in prime subgroup).
         * Always torsion-free for cofactor=1 curves.
         */
      }, {
        key: "isTorsionFree",
        value: function isTorsionFree() {
          if (cofactor === _1n4)
            return true;
          if (_isTorsionFree)
            return _isTorsionFree(Point2, this);
          return wnaf.mulUnsafe(this, CURVE_ORDER).is0();
        }
      }, {
        key: "clearCofactor",
        value: function clearCofactor() {
          if (cofactor === _1n4)
            return this;
          if (_clearCofactor)
            return _clearCofactor(Point2, this);
          return this.multiplyUnsafe(cofactor);
        }
      }, {
        key: "isSmallOrder",
        value: function isSmallOrder() {
          if (cofactor === _1n4)
            return this.is0();
          return this.clearCofactor().is0();
        }
      }, {
        key: "toBytes",
        value: function toBytes2(isCompressed = true) {
          abool2(isCompressed, "isCompressed");
          this.assertValidity();
          return encodePoint(Point2, this, isCompressed);
        }
      }, {
        key: "toHex",
        value: function toHex(isCompressed = true) {
          return bytesToHex2(this.toBytes(isCompressed));
        }
      }, {
        key: "toString",
        value: function toString() {
          return `<Point ${this.is0() ? "ZERO" : this.toHex()}>`;
        }
      }], [{
        key: "CURVE",
        value: function CURVE() {
          return _CURVE;
        }
        /** Does NOT validate if the point is valid. Use `.assertValidity()`. */
      }, {
        key: "fromAffine",
        value: function fromAffine(p) {
          const { x, y } = p || {};
          if (!p || !Fp.isValid(x) || !Fp.isValid(y))
            throw new Error("invalid affine point");
          if (p instanceof Point2)
            throw new Error("projective point not allowed");
          if (Fp.is0(x) && Fp.is0(y))
            return Point2.ZERO;
          return new Point2(x, y, Fp.ONE);
        }
      }, {
        key: "fromBytes",
        value: function fromBytes2(bytes) {
          const P = Point2.fromAffine(decodePoint(abytes3(bytes, void 0, "point")));
          P.assertValidity();
          return P;
        }
      }, {
        key: "fromHex",
        value: function fromHex(hex) {
          return Point2.fromBytes(hexToBytes2(hex));
        }
      }]);
    })();
    _Point = Point;
    _defineProperty7(Point, "BASE", new _Point(_CURVE.Gx, _CURVE.Gy, Fp.ONE));
    _defineProperty7(Point, "ZERO", new _Point(Fp.ZERO, Fp.ONE, Fp.ZERO));
    _defineProperty7(Point, "Fp", Fp);
    _defineProperty7(Point, "Fn", Fn);
    const normalize = (points) => normalizeZ(Point, points);
    const wnaf = new ScalarMultiplier(Point, randomBytes3);
    if (wnaf.bits >= 6)
      Point.BASE.precompute(6);
    Object.freeze(Point.prototype);
    Object.freeze(Point);
    return Point;
  }
  function pprefix(hasEvenY) {
    return Uint8Array.of(hasEvenY ? 2 : 3);
  }
  function getWLengths(Fp, Fn) {
    return {
      secretKey: Fn.BYTES,
      publicKey: 1 + Fp.BYTES,
      publicKeyUncompressed: 1 + 2 * Fp.BYTES,
      publicKeyHasPrefix: true,
      // Raw compact `(r || s)` signature width; DER and recovered signatures use
      // different lengths outside this helper.
      signature: 2 * Fn.BYTES
    };
  }
  function ecdh(Point, ecdhOpts = {}) {
    validatePointCons(Point);
    const { Fn } = Point;
    const randomBytes_ = ecdhOpts.randomBytes === void 0 ? randomBytes2 : ecdhOpts.randomBytes;
    const lengths = Object.assign(getWLengths(Point.Fp, Fn), {
      seed: Math.max(getMinHashLength(Fn.ORDER), 16)
    });
    function isValidSecretKey(secretKey) {
      try {
        const num = Fn.fromBytes(secretKey);
        return Fn.isValidNot0(num);
      } catch (error) {
        return false;
      }
    }
    function isValidPublicKey(publicKey, isCompressed) {
      const { publicKey: comp, publicKeyUncompressed } = lengths;
      try {
        const l = publicKey.length;
        if (isCompressed === true && l !== comp)
          return false;
        if (isCompressed === false && l !== publicKeyUncompressed)
          return false;
        return !Point.fromBytes(publicKey).is0();
      } catch (error) {
        return false;
      }
    }
    function randomSecretKey(seed) {
      seed = seed === void 0 ? randomBytes_(lengths.seed) : seed;
      return mapHashToField(abytes3(seed, lengths.seed, "seed"), Fn.ORDER);
    }
    function getPublicKey(secretKey, isCompressed = true) {
      return Point.BASE.multiply(Fn.fromBytes(secretKey)).toBytes(isCompressed);
    }
    function isProbPub(item) {
      const { secretKey, publicKey, publicKeyUncompressed } = lengths;
      const allowedLengths = Fn._lengths;
      if (!isBytes3(item))
        return void 0;
      const l = abytes3(item, void 0, "key").length;
      const isPub = l === publicKey || l === publicKeyUncompressed;
      const isSec = l === secretKey || !!allowedLengths?.includes(l);
      if (isPub && isSec)
        return void 0;
      return isPub;
    }
    function getSharedSecret(secretKeyA, publicKeyB, isCompressed = true) {
      if (isProbPub(secretKeyA) === true)
        throw new Error("first arg must be private key");
      if (isProbPub(publicKeyB) === false)
        throw new Error("second arg must be public key");
      const s = Fn.fromBytes(secretKeyA);
      const b = Point.fromBytes(publicKeyB);
      if (b.is0())
        throw new Error("invalid public key: point at infinity");
      return b.multiply(s).toBytes(isCompressed);
    }
    const utils = {
      isValidSecretKey,
      isValidPublicKey,
      randomSecretKey
    };
    const keygen = createKeygen(randomSecretKey, getPublicKey);
    Object.freeze(utils);
    Object.freeze(lengths);
    return Object.freeze({
      getPublicKey,
      getSharedSecret,
      keygen,
      Point,
      utils,
      lengths
    });
  }
  function ecdsa(Point, hash, ecdsaOpts = {}) {
    validatePointCons(Point);
    const hash_ = hash;
    ahash(hash_);
    validateObject(ecdsaOpts, {}, {
      hmac: "function",
      lowS: "boolean",
      randomBytes: "function",
      bits2int: "function",
      bits2int_modN: "function"
    });
    const opts = Object.assign({}, ecdsaOpts);
    const randomBytes3 = opts.randomBytes === void 0 ? randomBytes2 : opts.randomBytes;
    const hmac2 = opts.hmac === void 0 ? (key, msg) => hmac(hash_, key, msg) : opts.hmac;
    const { Fp, Fn } = Point;
    const { ORDER: CURVE_ORDER, BITS: fnBits } = Fn;
    const blindLength = getMinHashLength(CURVE_ORDER);
    const csprng = probeRandomBytes(randomBytes3, blindLength);
    const { keygen, getPublicKey, getSharedSecret, utils, lengths } = ecdh(Point, opts);
    const defaultSigOpts = {
      prehash: true,
      lowS: typeof opts.lowS === "boolean" ? opts.lowS : true,
      format: "compact",
      extraEntropy: false
    };
    const hasLargeRecoveryLifts = CURVE_ORDER * _2n2 + _1n4 < Fp.ORDER;
    function isBiggerThanHalfOrder(number) {
      const HALF = CURVE_ORDER >> _1n4;
      return number > HALF;
    }
    function validateRS(title, num) {
      if (!Fn.isValidNot0(num))
        throw new Error(`invalid signature ${title}: out of range 1..Point.Fn.ORDER`);
      return num;
    }
    function assertFieldSignIsSupported() {
      if (!Fp.isOdd)
        throw new Error("Field doesn't support isOdd");
    }
    function getRecoveryBit(x, y, r) {
      assertFieldSignIsSupported();
      return (x === r ? 0 : 2) | Number(Fp.isOdd(y));
    }
    function assertRecoverableCurve() {
      if (hasLargeRecoveryLifts)
        throw new Error('"recovered" sig type is not supported for cofactor >2 curves');
    }
    function validateSigLength(bytes, format) {
      validateSigFormat(format);
      const size = lengths.signature;
      const sizer = format === "compact" ? size : format === "recovered" ? size + 1 : void 0;
      return abytes3(bytes, sizer);
    }
    let Signature = /* @__PURE__ */ (function() {
      function Signature2(r, s, recovery) {
        _classCallCheck8(this, Signature2);
        _defineProperty7(this, "r", void 0);
        _defineProperty7(this, "s", void 0);
        _defineProperty7(this, "recovery", void 0);
        this.r = validateRS("r", r);
        this.s = validateRS("s", s);
        if (recovery != null) {
          assertRecoverableCurve();
          if (![0, 1, 2, 3].includes(recovery))
            throw new Error("invalid recovery id");
          this.recovery = recovery;
        }
        Object.freeze(this);
      }
      return _createClass8(Signature2, [{
        key: "assertRecovery",
        value: function assertRecovery() {
          const { recovery } = this;
          if (recovery == null)
            throw new Error("invalid recovery id: must be present");
          return recovery;
        }
      }, {
        key: "addRecoveryBit",
        value: function addRecoveryBit(recovery) {
          return new Signature2(this.r, this.s, recovery);
        }
        // Unlike the top-level helper below, this method expects a digest that has
        // already been hashed to the curve's message representative.
      }, {
        key: "recoverPublicKey",
        value: function recoverPublicKey2(messageHash) {
          const { r, s } = this;
          const recovery = this.assertRecovery();
          const radj = recovery === 2 || recovery === 3 ? r + CURVE_ORDER : r;
          if (!Fp.isValid(radj))
            throw new Error("invalid recovery id: sig.r+curve.n != R.x");
          const x = Fp.toBytes(radj);
          const R = Point.fromBytes(concatBytes3(pprefix((recovery & 1) === 0), x));
          const ir = Fn.inv(radj);
          const h = bits2int_modN(abytes3(messageHash, void 0, "msgHash"));
          const u1 = Fn.create(-h * ir);
          const u2 = Fn.create(s * ir);
          const Q = Point.BASE.mulAddUnsafe(u1, R, u2);
          if (Q.is0())
            throw new Error("invalid recovery: point at infinify");
          Q.assertValidity();
          return Q;
        }
        // Signatures should be low-s, to prevent malleability.
      }, {
        key: "hasHighS",
        value: function hasHighS() {
          return isBiggerThanHalfOrder(this.s);
        }
      }, {
        key: "toBytes",
        value: function toBytes(format = defaultSigOpts.format) {
          validateSigFormat(format);
          if (format === "der")
            return hexToBytes2(DER.hexFromSig(this));
          const { r, s } = this;
          const rb = Fn.toBytes(r);
          const sb = Fn.toBytes(s);
          if (format === "recovered") {
            assertRecoverableCurve();
            return concatBytes3(Uint8Array.of(this.assertRecovery()), rb, sb);
          }
          return concatBytes3(rb, sb);
        }
      }, {
        key: "toHex",
        value: function toHex(format) {
          return bytesToHex2(this.toBytes(format));
        }
      }], [{
        key: "fromBytes",
        value: function fromBytes(bytes, format = defaultSigOpts.format) {
          validateSigLength(bytes, format);
          let recid;
          if (format === "der") {
            if (bytes.length > 2 * Fn.BYTES + 16)
              throw new DER.Err("invalid signature: DER signature too long");
            const { r: r2, s: s2 } = DER.toSig(abytes3(bytes), Fn.BYTES + 1);
            return new Signature2(r2, s2);
          }
          if (format === "recovered") {
            recid = bytes[0];
            format = "compact";
            bytes = bytes.subarray(1);
          }
          const L = lengths.signature / 2;
          const r = bytes.subarray(0, L);
          const s = bytes.subarray(L, L * 2);
          return new Signature2(Fn.fromBytes(r), Fn.fromBytes(s), recid);
        }
      }, {
        key: "fromHex",
        value: function fromHex(hex, format) {
          return this.fromBytes(hexToBytes2(hex), format);
        }
      }]);
    })();
    Object.freeze(Signature.prototype);
    Object.freeze(Signature);
    const bits2int = opts.bits2int === void 0 ? function bits2int_def(bytes) {
      if (bytes.length > 8192)
        throw new Error("input is too large");
      const num = bytesToNumberBE(bytes);
      const delta = bytes.length * 8 - fnBits;
      return delta > 0 ? num >> BigInt(delta) : num;
    } : opts.bits2int;
    const bits2int_modN = opts.bits2int_modN === void 0 ? function bits2int_modN_def(bytes) {
      return Fn.create(bits2int(bytes));
    } : opts.bits2int_modN;
    const ORDER_MASK = bitMask(fnBits);
    function int2octets(num) {
      aInRange("num < 2^" + fnBits, num, _0n5, ORDER_MASK);
      return Fn.toBytes(num);
    }
    function validateMsgAndHash(message, prehash) {
      abytes3(message, void 0, "message");
      return prehash ? abytes3(hash_(message), void 0, "prehashed message") : message;
    }
    function prepSig(message, secretKey, opts2) {
      const { lowS, prehash, extraEntropy } = validateSigOpts(opts2, defaultSigOpts);
      message = validateMsgAndHash(message, prehash);
      const h1int = bits2int_modN(message);
      const d = Fn.fromBytes(secretKey);
      if (!Fn.isValidNot0(d))
        throw new Error("invalid private key");
      const seedArgs = [int2octets(d), int2octets(h1int)];
      if (extraEntropy != null && extraEntropy !== false) {
        const e = extraEntropy === true ? randomBytes3(lengths.secretKey) : extraEntropy;
        seedArgs.push(abytes3(e, void 0, "extraEntropy"));
      }
      const seed = concatBytes3(...seedArgs);
      const m = h1int;
      function k2sig(kBytes) {
        const k = bits2int(kBytes);
        if (!Fn.isValidNot0(k))
          return;
        const q = Point.BASE.multiply(k).toAffine();
        const r = Fn.create(q.x);
        if (r === _0n5)
          return;
        let s;
        if (csprng !== void 0) {
          const b = bytesToNumberBE(mapHashToField(csprng(blindLength), CURVE_ORDER));
          const ibk = Fn.inv(Fn.mul(b, k));
          const bm = Fn.mul(b, m);
          const bd = Fn.mul(b, d);
          s = Fn.create(ibk * Fn.create(bm + bd * r));
        } else {
          const ik = invertCt(k, CURVE_ORDER);
          s = Fn.create(ik * Fn.create(m + r * d));
        }
        if (s === _0n5)
          return;
        let recovery = getRecoveryBit(q.x, q.y, r);
        let normS = s;
        if (lowS && isBiggerThanHalfOrder(s)) {
          normS = Fn.neg(s);
          recovery ^= 1;
        }
        return new Signature(r, normS, hasLargeRecoveryLifts ? void 0 : recovery);
      }
      return {
        seed,
        k2sig
      };
    }
    function sign2(message, secretKey, opts2 = {}) {
      const { seed, k2sig } = prepSig(message, secretKey, opts2);
      const drbg = createHmacDrbg(hash_.outputLen, Fn.BYTES, hmac2);
      const sig = drbg(seed, k2sig);
      return sig.toBytes(opts2.format);
    }
    function verify(signature, message, publicKey, opts2 = {}) {
      const { lowS, prehash, format } = validateSigOpts(opts2, defaultSigOpts);
      publicKey = abytes3(publicKey, void 0, "publicKey");
      message = validateMsgAndHash(message, prehash);
      if (!isBytes3(signature)) {
        const end = signature instanceof Signature ? ", use sig.toBytes()" : "";
        throw new Error("verify expects Uint8Array signature" + end);
      }
      validateSigLength(signature, format);
      try {
        const sig = Signature.fromBytes(signature, format);
        const P = Point.fromBytes(publicKey);
        if (P.is0())
          return false;
        if (lowS && sig.hasHighS())
          return false;
        const { r, s } = sig;
        const h = bits2int_modN(message);
        const is = Fn.inv(s);
        const u1 = Fn.create(h * is);
        const u2 = Fn.create(r * is);
        const R = Point.BASE.mulAddUnsafe(u1, P, u2);
        if (R.is0())
          return false;
        const q = R.toAffine();
        const v = Fn.create(q.x);
        if (v !== r)
          return false;
        if (format === "recovered" && sig.recovery !== getRecoveryBit(q.x, q.y, r))
          return false;
        return true;
      } catch (e) {
        return false;
      }
    }
    function recoverPublicKey(signature, message, opts2 = {}) {
      const { prehash } = validateSigOpts(opts2, defaultSigOpts);
      message = validateMsgAndHash(message, prehash);
      return Signature.fromBytes(signature, "recovered").recoverPublicKey(message).toBytes();
    }
    return Object.freeze({
      keygen,
      getPublicKey,
      getSharedSecret,
      utils,
      lengths,
      Point,
      sign: sign2,
      verify,
      recoverPublicKey,
      Signature,
      hash: hash_
    });
  }

  // node_modules/@noble/curves/nist.js
  var p256_CURVE = /* @__PURE__ */ (() => ({
    p: BigInt("0xffffffff00000001000000000000000000000000ffffffffffffffffffffffff"),
    n: BigInt("0xffffffff00000000ffffffffffffffffbce6faada7179e84f3b9cac2fc632551"),
    h: BigInt(1),
    a: BigInt("0xffffffff00000001000000000000000000000000fffffffffffffffffffffffc"),
    b: BigInt("0x5ac635d8aa3a93e7b3ebbd55769886bc651d06b0cc53b0f63bce3c3e27d2604b"),
    Gx: BigInt("0x6b17d1f2e12c4247f8bce6e563a440f277037d812deb33a0f4a13945d898c296"),
    Gy: BigInt("0x4fe342e2fe1a7f9b8ee7eb4a7c0f9e162bce33576b315ececbb6406837bf51f5")
  }))();
  var p256_Point = /* @__PURE__ */ weierstrass(p256_CURVE);
  var p256 = /* @__PURE__ */ ecdsa(p256_Point, sha256);

  // src/portable.ts
  var alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";
  function decode64(value) {
    const str = value.replace(/-/g, "+").replace(/_/g, "/").replace(/=+$/, "");
    const out = [];
    let accumulator = 0, bits = 0;
    for (const char of str) {
      const n = alphabet.indexOf(char);
      if (n < 0)
        throw new Error("Invalid base64");
      accumulator = accumulator << 6 | n;
      bits += 6;
      if (bits >= 8) {
        bits -= 8;
        out.push(accumulator >>> bits & 255);
      }
    }
    return new Uint8Array(out);
  }
  function encode64(bytes) {
    let out = "", accumulator = 0, bits = 0;
    for (const byte of bytes) {
      accumulator = accumulator << 8 | byte;
      bits += 8;
      while (bits >= 6) {
        bits -= 6;
        out += alphabet[accumulator >>> bits & 63];
      }
    }
    if (bits)
      out += alphabet[accumulator << 6 - bits & 63];
    return out.replace(/\+/g, "-").replace(/\//g, "_");
  }
  function ascii(value) {
    const a = new Uint8Array(value.length);
    for (let i = 0; i < value.length; i++)
      a[i] = value.charCodeAt(i);
    return a;
  }
  function utf8(bytes) {
    let s = "";
    for (let i = 0; i < bytes.length; i++) {
      let c = bytes[i];
      if (c < 128) {
        s += String.fromCharCode(c);
        continue;
      }
      let extra = (c & 224) === 192 ? 1 : (c & 240) === 224 ? 2 : 3;
      c &= extra === 1 ? 31 : extra === 2 ? 15 : 7;
      for (let n = 0; n < extra; n++) {
        if (++i >= bytes.length)
          throw new Error("Invalid UTF8");
        c = c << 6 | bytes[i] & 63;
      }
      if (c > 65535) {
        c -= 65536;
        s += String.fromCharCode(55296 + (c >> 10), 56320 + (c & 1023));
      } else
        s += String.fromCharCode(c);
    }
    return s;
  }
  function decrypt(envelope) {
    const version = Number(envelope.version);
    const parts = envelope.key_parts;
    if (!Array.isArray(parts) || !parts.length)
      throw new Error("No playback key parts");
    const selected = version >= 1 && version <= 20 && version <= parts.length && 31 - version <= parts.length ? [parts[version - 1], parts[30 - version]] : parts;
    const decoded = selected.map(decode64);
    const key = new Uint8Array(decoded.reduce((n, p) => n + p.length, 0));
    let offset = 0;
    for (const a of decoded) {
      key.set(a, offset);
      offset += a.length;
    }
    return JSON.parse(utf8(gcm(key, decode64(envelope.iv)).decrypt(decode64(envelope.payload))));
  }
  function sign(nonce, privateScalar) {
    return encode64(p256.sign(ascii(nonce), decode64(privateScalar)));
  }
  function decryptFixture(key, iv, payload) {
    return utf8(gcm(key, decode64(iv)).decrypt(decode64(payload)));
  }

  // src/proof.js
  var rol = (n, k) => (n << k | n >>> 32 - k) >>> 0;
  function mix(s) {
    s[0] = s[0] + s[1] >>> 0;
    s[3] = rol(s[3] ^ s[0], 16);
    s[2] = s[2] + s[3] >>> 0;
    s[1] = rol(s[1] ^ s[2], 12);
    s[0] = s[0] + s[1] >>> 0;
    s[3] = rol(s[3] ^ s[0], 8);
    s[2] = s[2] + s[3] >>> 0;
    s[1] = rol(s[1] ^ s[2], 7);
  }
  function digest(text) {
    const s = new Uint32Array([1779033703, 3144134277, 1013904242, 2773480762]);
    for (const b of Array.from(text, (char) => char.charCodeAt(0) & 255)) {
      s[0] = rol(s[0] + b >>> 0, 7);
      mix(s);
    }
    for (let i = 0; i < 8; i++)
      mix(s);
    const mem = new Uint32Array(512);
    for (let i = 0; i < 512; i++) {
      mix(s);
      mem[i] = (s[0] ^ s[2]) >>> 0;
    }
    for (let pass = 0; pass < 2; pass++)
      for (let i = 0; i < 512; i++) {
        let n = rol(mem[i] + mem[mem[i] & 511] >>> 0, 13);
        n = (n ^ Math.imul(mem[i + 1 & 511], 2654435761)) >>> 0;
        mem[i] = n;
        s[0] = (s[0] ^ n) >>> 0;
        mix(s);
      }
    const out = new Uint32Array(8);
    for (let i = 0; i < 8; i++) {
      mix(s);
      let n = s[0];
      for (let k = 0; k < 64; k++) {
        const v = mem[i * 64 + k];
        n = rol(n + v >>> 0, 5);
        n = (n ^ Math.imul(v, 2246822519)) >>> 0;
      }
      out[i] = (n ^ s[2]) >>> 0;
    }
    return out;
  }
  function zeroBits(a) {
    let n = 0;
    for (const v of a) {
      if (v === 0)
        n += 32;
      else
        return n + Math.clz32(v);
    }
    return n;
  }

  // src/resolver.ts
  var base = "https://mfw09.org";
  var fingerprint;
  var identityTime = 0;
  var backoffUntil = 0;
  var pause = (n) => new Promise((r) => setTimeout(r, n));
  function selfTest() {
    const k = new Uint8Array(selftest_default.key.match(/../g).map((s) => parseInt(s, 16)));
    if (decryptFixture(k, selftest_default.iv, selftest_default.payload) !== selftest_default.expected)
      throw new Error("AES-GCM self-test failed");
    const signature = decode64(sign("JFT native resolver signing self-test", identity_default.d));
    if (signature.length !== 64)
      throw new Error("Signing self-test failed");
    const expected = [536877256, 1719889466, 3190130838, 1037791045, 3437860769, 1203933718, 267476075, 1306084991];
    const actual = digest("JFT-test:123");
    if (expected.some((value, index) => value !== actual[index]))
      throw new Error("Proof self-test failed");
  }
  function resolveOnDevice(req, progress, cancelled) {
    return __async(this, null, function* () {
      const check = () => {
        if (cancelled())
          throw new Error("Cancelled");
      };
      selfTest();
      progress("Native runtime, signing and authenticated decryption checks passed.");
      check();
      if (req.diagnostic)
        return "";
      if (req.kind === "Series")
        throw new Error("Episode selection is not connected in this prototype.");
      if (!req.videoCode || !/^[a-z0-9]+$/i.test(req.videoCode))
        throw new Error("This title does not yet have a mapped provider video code. Try Spider-Man or The Avengers.");
      if (Date.now() < backoffUntil)
        throw new Error("Provider rate limit: wait before trying again.");
      const code = req.videoCode;
      function request(_0, _1) {
        return __async(this, arguments, function* (path, body, extra = {}) {
          check();
          const controller = new AbortController();
          const timer = setTimeout(() => controller.abort(), 2e4);
          try {
            const agent = new HttpsAgent({
              certificatesFile: "common:/certs/ca-bundle.crt"
            });
            const init = {
              method: body === void 0 ? "GET" : "POST",
              headers: {
                "User-Agent": "JFT-Roku-Resolver/0.1",
                "Content-Type": "application/json",
                "Origin": base,
                "Referer": base + "/e/" + code,
                "X-Embed-Origin": "1hd.one",
                "X-Embed-Referer": "https://1hd.one/",
                ...extra
              },
              agent,
              signal: controller.signal,
              body: body === void 0 ? void 0 : JSON.stringify(body)
            };
            const NativeRequest = globalThis.Request;
            const response2 = yield globalThis.fetch(new NativeRequest(path.startsWith("https://") ? path : base + path, init));
            const text = yield response2.text();
            check();
            if (response2.status === 429) {
              backoffUntil = Date.now() + 10 * 60 * 1e3;
              throw new Error("Provider rate-limited this device. Retry later.");
            }
            if (response2.status !== 200)
              throw new Error("Provider returned HTTP " + response2.status + ".");
            try {
              return JSON.parse(text);
            } catch {
              return text;
            }
          } finally {
            clearTimeout(timer);
          }
        });
      }
      if (!fingerprint || Date.now() - identityTime > 5 * 60 * 1e3) {
        progress("Registering the Roku client with the provider...");
        const challenge2 = yield request("/api/videos/access/challenge", {});
        if (!challenge2.nonce)
          throw new Error("Invalid device challenge");
        const { d, ...publicKey } = identity_default;
        const a = yield request("/api/videos/access/attest", {
          viewer_id: "",
          device_id: "",
          challenge_id: challenge2.challenge_id,
          nonce: challenge2.nonce,
          signature: sign(challenge2.nonce, d),
          public_key: publicKey,
          client: {
            user_agent: "JFT-Roku-Resolver/0.1",
            languages: ["en"],
            timezone: "America/Port_of_Spain"
          },
          storage: {},
          attributes: {
            entropy: "low"
          }
        });
        if (!a.token)
          throw new Error("Provider did not accept client registration");
        fingerprint = a;
        identityTime = Date.now();
      }
      progress("Requesting the source verification check...");
      const challenge = yield request(`/api/videos/${code}/embed/captcha`, {
        fingerprint
      });
      const difficulty = challenge.pow_difficulty;
      if (!challenge.pow_nonce || typeof difficulty !== "number" || difficulty < 0 || difficulty > 22)
        throw new Error("Provider requires interactive or unsupported verification.");
      const started = Date.now();
      let solution;
      for (let counter = 0; Date.now() - started < 9e4; counter++) {
        if (zeroBits(digest(challenge.pow_nonce + ":" + counter)) >= difficulty) {
          solution = String(counter);
          break;
        }
        if (counter % 32 === 0) {
          check();
          if (counter % 256 === 0)
            progress("Computing verification on the Roku: " + Math.floor((Date.now() - started) / 1e3) + " seconds");
          yield pause(0);
        }
      }
      if (solution === void 0)
        throw new Error("Verification exceeded 90 seconds on this Roku.");
      progress("Submitting verification...");
      const verified = yield request(`/api/videos/${code}/embed/captcha/verify`, {
        pow_token: challenge.pow_token,
        solution,
        fingerprint
      });
      if (verified.status !== "ok" || !verified.token)
        throw new Error("Provider rejected verification: " + (verified.reason || "unknown reason"));
      progress("Retrieving and decrypting a fresh stream...");
      const response = yield request(`/api/videos/${code}/embed/playback`, {
        fingerprint
      }, {
        "X-Captcha-Token": verified.token
      });
      const data = decrypt(response.playback);
      const source = data.sources?.find((s) => s.mime_type === "application/vnd.apple.mpegurl" && /^https:\/\//i.test(s.url));
      if (!source)
        throw new Error("No compatible HLS stream was returned");
      progress("Checking the fresh video playlist...");
      const playlist = yield request(source.url);
      if (typeof playlist !== "string" || !playlist.startsWith("#EXTM3U"))
        throw new Error("The source did not return an HLS playlist");
      check();
      return source.url;
    });
  }

  // src/anchor.tsx
  var descriptor = {
    componentName: "JFTNativeResolver",
    extends: "Group",
    inputFields: {
      request: AnchorNodeFieldTypes.String(""),
      cancel: AnchorNodeFieldTypes.String("")
    },
    outputFields: {
      ready: AnchorNodeFieldTypes.Boolean(false),
      status: AnchorNodeFieldTypes.String(""),
      result: AnchorNodeFieldTypes.String("")
    }
  };
  var Resolver = (inputs, outputs) => {
    let generation = 0;
    onMount(() => outputs.ready(true));
    createEffect(() => {
      if (inputs.cancel)
        generation++;
    });
    createEffect(() => {
      const raw = inputs.request;
      if (!raw)
        return;
      const current = ++generation;
      let req;
      try {
        req = JSON.parse(raw);
      } catch {
        return;
      }
      outputs.status("Starting native resolver...");
      void resolveOnDevice(req, (s) => {
        if (current === generation)
          outputs.status(s);
      }, () => current !== generation).then((url) => {
        if (current !== generation)
          return;
        outputs.result(JSON.stringify({
          requestId: req.requestId,
          url,
          diagnostic: !!req.diagnostic,
          ok: true
        }));
      }).catch((error) => {
        if (current === generation)
          outputs.result(JSON.stringify({
            requestId: req.requestId,
            ok: false,
            error: error instanceof Error ? error.message : String(error)
          }));
      });
    });
    return createElement("group");
  };
  var anchor_default = defineAnchorNode(descriptor, Resolver);

  // src/index.ts
  main(() => {
    enableExceptionTagging();
    registerAnchorNode(anchor_default);
  });
})();
/*! Bundled license information:

@noble/ciphers/utils.js:
  (*! noble-ciphers - MIT License (c) 2023 Paul Miller (paulmillr.com) *)

@noble/curves/utils.js:
@noble/curves/abstract/modular.js:
@noble/curves/abstract/curve.js:
@noble/curves/abstract/der.js:
@noble/curves/abstract/weierstrass.js:
@noble/curves/nist.js:
  (*! noble-curves - MIT License (c) 2022 Paul Miller (paulmillr.com) *)
*/
//# sourceMappingURL=index.js.map
