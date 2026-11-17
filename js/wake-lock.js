/* MTI6-GTADWIY-COCKPIT — Screen Lock (v111, corrected owner language)
 *
 * Owner language (2026-11-17, supersedes the first v111 build's
 * "Keep screen lit" toggle, whose ON/OFF was inverted versus this):
 *
 *   SCREEN LOCK ON  = release the MTI6 wake lock; the device may
 *                     dim or sleep on its normal timeout.
 *   SCREEN LOCK OFF = request the wake lock; the screen stays awake
 *                     while the cockpit tab is visible and the
 *                     platform/browser permits it.
 *
 * Default is Screen Lock OFF (screen stays awake — Daniel's
 * original ask: "make the screen stay lit dont sleep or turn off").
 * This controls DISPLAY sleep behavior only, never device
 * authentication/security.
 *
 * The preference is stored under KEY ("on" | "off"). The first v111
 * build stored the inverted choice under an earlier key; that key is
 * never read again, so no stored inverted choice can leak into the
 * corrected meaning.
 *
 * OWNER PREFERENCE and ACTUAL WAKE LOCK STATE are two separate
 * facts, and getState() reports both:
 * - preference: screenLockOn (true = ON, device may sleep).
 * - actual state: ACTIVE (a lock is held), RELEASED (no lock is
 *   held and none is being requested), NOT_SUPPORTED (this browser
 *   has no Wake Lock API), FAILED (the request was rejected, with
 *   the reason), REQUESTING (a request is in flight — transient).
 * Never claim ACTIVE unless a lock is actually held.
 *
 * The lock is a REQUEST to the browser, not a guarantee: the
 * browser may refuse it, and the OS may still dim the screen.
 * The API releases the lock when the tab hides; that is the API's
 * own behavior, not a bug — the module re-requests on return to
 * visible. A release while visible is re-requested too.
 * A first request may need a user gesture (NotAllowedError); the
 * module retries on the first pointerdown/keydown after a failure.
 *
 * One central capability: Settings and STAR commands both go
 * through setScreenLock(on) here — no separate bot-specific
 * wake-lock logic anywhere. Nothing here ever writes to IndexedDB
 * or any canonical record; the preference is localStorage only.
 */
(function (global) {
  "use strict";

  var KEY = "mti6_screen_lock_v1";

  var lock = null;
  var requesting = false;
  var gestureArmed = false;
  var started = false;
  var lastError = null;
  var listeners = [];

  function nav() {
    return (typeof navigator !== "undefined") ? navigator : null;
  }
  function doc() {
    return (typeof document !== "undefined") ? document : null;
  }

  function isSupported() {
    var n = nav();
    return !!(n && n.wakeLock && typeof n.wakeLock.request === "function");
  }

  // Owner preference. Default OFF: no stored choice means Daniel's
  // asked-for default (screen stays awake).
  function isScreenLockOn() {
    try {
      if (!global.localStorage) return false;
      var raw = global.localStorage.getItem(KEY);
      if (raw === null || raw === undefined) return false;
      return raw === "on";
    } catch (e) {
      return false;
    }
  }

  // Actual lock state, separate from the preference. NOT_SUPPORTED
  // is a capability fact and outranks the preference; FAILED is a
  // rejected request with its reason; RELEASED is simply "no lock
  // is held and none is being requested".
  function getState() {
    var screenLockOn = isScreenLockOn();
    var supported = isSupported();
    var st;
    if (!supported) st = "NOT_SUPPORTED";
    else if (lock) st = "ACTIVE";
    else if (lastError) st = "FAILED";
    else if (!screenLockOn && requesting) st = "REQUESTING";
    else st = "RELEASED";
    return { screenLockOn: screenLockOn, supported: supported, state: st,
      reason: st === "FAILED" ? lastError : null };
  }

  function notify() {
    var s = getState();
    listeners.slice().forEach(function (fn) {
      try { fn(s); } catch (e) {}
    });
  }

  function onChange(fn) {
    if (typeof fn === "function") listeners.push(fn);
  }

  function onRelease() {
    lock = null;
    notify();
    // _resetForTests releases the lock while tearing the singleton
    // down (started === false): never re-request from that path.
    if (!started) return;
    if (isScreenLockOn()) return;
    var d = doc();
    if (d && d.visibilityState === "hidden") return;
    request();
  }

  function onVisibilityChange() {
    var d = doc();
    if (!d || d.visibilityState !== "visible") return;
    if (isScreenLockOn() || lock || requesting) return;
    request();
  }

  function onGesture() {
    disarmGestureRetry();
    request();
  }

  function armGestureRetry() {
    if (gestureArmed) return;
    var d = doc();
    if (!d || typeof d.addEventListener !== "function") return;
    gestureArmed = true;
    d.addEventListener("pointerdown", onGesture);
    d.addEventListener("keydown", onGesture);
  }

  function disarmGestureRetry() {
    if (!gestureArmed) return;
    gestureArmed = false;
    var d = doc();
    if (!d || typeof d.removeEventListener !== "function") return;
    d.removeEventListener("pointerdown", onGesture);
    d.removeEventListener("keydown", onGesture);
  }

  async function request() {
    if (isScreenLockOn() || !isSupported()) return false;
    var d = doc();
    if (d && d.visibilityState === "hidden") return false;
    if (lock || requesting) return !!lock;
    requesting = true;
    notify();
    try {
      var l = await nav().wakeLock.request("screen");
      lock = l;
      requesting = false;
      lastError = null;
      disarmGestureRetry();
      if (l && typeof l.addEventListener === "function") {
        l.addEventListener("release", onRelease);
      }
      notify();
      return true;
    } catch (e) {
      requesting = false;
      lock = null;
      lastError = (e && e.name ? e.name + ": " : "") +
        (e && e.message ? e.message : "request rejected");
      notify();
      armGestureRetry();
      return false;
    }
  }

  // The one central Screen Lock setter — Settings and STAR commands
  // both go through here, so the two stay synchronized. Returns the
  // settled state (preference + actual lock state) after the
  // release/request has run.
  async function setScreenLock(on) {
    var lockOn = !!on;
    try {
      if (global.localStorage) {
        global.localStorage.setItem(KEY, lockOn ? "on" : "off");
      }
    } catch (e) {}
    if (lockOn) {
      var l = lock;
      lock = null;
      lastError = null;
      disarmGestureRetry();
      if (l && typeof l.release === "function") {
        try { l.release(); } catch (e) {}
      }
      notify();
      return getState();
    }
    await request();
    return getState();
  }

  function init() {
    if (started) return getState();
    started = true;
    var d = doc();
    if (d && typeof d.addEventListener === "function") {
      d.addEventListener("visibilitychange", onVisibilityChange);
    }
    if (isScreenLockOn() || !isSupported()) {
      notify();
      return getState();
    }
    request();
    return getState();
  }

  // Harness seam: clears the singleton state (listeners included)
  // so one window can run several scenarios. Never used by the app.
  function _resetForTests() {
    var l = lock;
    lock = null;
    requesting = false;
    lastError = null;
    started = false;
    gestureArmed = false;
    listeners = [];
    if (l && typeof l.release === "function") {
      try { l.release(); } catch (e) {}
    }
    var d = doc();
    if (d && typeof d.removeEventListener === "function") {
      d.removeEventListener("visibilitychange", onVisibilityChange);
      d.removeEventListener("pointerdown", onGesture);
      d.removeEventListener("keydown", onGesture);
    }
  }

  global.WakeLock = {
    init: init,
    request: request,
    isScreenLockOn: isScreenLockOn,
    setScreenLock: setScreenLock,
    getState: getState,
    isSupported: isSupported,
    onChange: onChange,
    _resetForTests: _resetForTests
  };
})(typeof window !== "undefined" ? window : this);
