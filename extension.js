import { Extension } from 'resource:///org/gnome/shell/extensions/extension.js';
import Meta from "gi://Meta"
import GLib from "gi://GLib"

// At module scope to ride out the extension disable/enable for a system suspend/resume
// Note that this appears to violate https://gjs.guide/extensions/review-guidelines/review-guidelines.html#destroy-all-objects
// though the earlier the example shows init() creating an extension object.  The extension object is empty, but it's still an object.
// This map will contain primitives but never any object references.  Are Gobject references what the guidelines are actually prohibiting?
// If this extension were written in the style shown in the guidelines, it looks like this would be part of the Extension class,
// initialized by the constructor().
const displaySize__windowId__state = new Map();

// The following are only used for logging
const EXTENSION_LOG_NAME = 'Window State Manager';
const START_TIME = GLib.DateTime.new_now_local().format_iso8601();

// Log levels
const LOG_NOTHING = 0;
const LOG_ERROR = 1;
const LOG_INFO = 2;
const LOG_DEBUG = 3;
const LOG_EVERYTHING = 4;

const LOG_LEVEL = LOG_ERROR;

// State of each window
class WindowState {
  constructor(window, log) {
    this._rect = window.get_frame_rect();
    this._maximized = window.get_maximized();
    this._minimized = window.minimized;

    // The following are only used for logging
    this._fullscreen = window.fullscreen;
    this._id = window.get_id();
    this._title = window.get_title();
    this._log = log;
    if (log >= LOG_INFO)
      log(`${EXTENSION_LOG_NAME} Save ${this}`);
  }

  toString() {
    const r = this._rect;
    return `x:${r.x}, y:${r.y}, w:${r.width}, h:${r.height}, maximized:${this._maximized}, ` +
      `minimized:${this._minimized}, fullscreen:${this._fullscreen}, id:${this._id}, title:${this._title}`;
  }

  restore(currentWindow) {
    if (!this._equalRect(currentWindow)) {
      if (currentWindow.get_maximized())
        currentWindow.unmaximize(Meta.MaximizeFlags.BOTH);
      this._moveResizeFrame(currentWindow);
    }
    this._setMaximized(currentWindow);
    this._setMinimized(currentWindow);
    this._logDifferences(currentWindow);
  }

  _equalRect(window) {
    const r = window.get_frame_rect();
    return this._rect.x === r.x && this._rect.y === r.y &&
      this._rect.width === r.width && this._rect.height === r.height;
  }

  _moveResizeFrame(window) {
    // Is it correct to set user_op => true?  Is this performing a user operation?
    window.move_resize_frame(true, this._rect.x, this._rect.y, this._rect.width, this._rect.height);
  }

  _setMaximized(window) {
    if (window.get_maximized() !== this._maximized) {
      if (this._maximized)
        window.maximize(this._maximized);
      else
        window.unmaximize(Meta.MaximizeFlags.BOTH);
    }
  }

  _setMinimized(window) {
    if (window.minimized !== this._minimized) {
      if (this._minimized)
        window.minimize();
      else
        window.unminimize();
    }
  }

  _logDifferences(window) {
    if (this._log >= LOG_ERROR) {
      let hasDiffs = false;
      if (window.minimized !== this._minimized) {
        log(`${EXTENSION_LOG_NAME} Error: Wrong minimized: ${window.minimized()}, title:${this._title}`);
        hasDiffs = true;
      }
      if (window.get_maximized() !== this._maximized) {
        log(`${EXTENSION_LOG_NAME} Error: Wrong maximized: ${window.get_maximized()}, title:${this._title}`);
        hasDiffs = true;
      }
      // This test fails when there is a difference between saved and current maximization, though the window
      // behaviour is correct.  Due to an asynchronous update?
      if (this._log >= LOG_EVERYTHING && !this._equalRect(window)) {
        const r = window.get_frame_rect();
        log(`${EXTENSION_LOG_NAME} Error: Wrong rectangle: x:${r.x}, y:${r.y}, w:${r.width}, h:${r.height}, title:${this._title}`);
        hasDiffs = true;
      }
      if (hasDiffs)
        log(`${EXTENSION_LOG_NAME} Expecting: ${this}`);
    }
  }
}

// State of all windows
class AllWindowsStates {
  constructor(log) {
    this._log = log;
  }

  _getWindows() {
    return global.get_window_actors().map(a => a.meta_window).filter(w => !w.is_skip_taskbar());
  }

  _getWindowStateMap(why) {
    const size = global.display.get_size();
    const displaySizeKey = size[0] * 100000 + size[1];
    if (!displaySize__windowId__state.has(displaySizeKey))
      displaySize__windowId__state.set(displaySizeKey, new Map());
    const windowId__state = displaySize__windowId__state.get(displaySizeKey);
    if (this._log >= LOG_DEBUG)
      log(`${EXTENSION_LOG_NAME} ${why} map size: ${windowId__state.size}  display size: ${size}  start time: ${START_TIME}`);
    return windowId__state;
  }

  saveWindowPositions(why) {
    const windowId__state = this._getWindowStateMap(why);
    windowId__state.clear();
    for (const window of this._getWindows())
      windowId__state.set(window.get_id(), new WindowState(window, this._log));
  }

  restoreWindowPositions(why) {
    const windowId__state = this._getWindowStateMap(why);
    for (const window of this._getWindows()) {
      if (windowId__state.has(window.get_id()))
        windowId__state.get(window.get_id()).restore(window);
      else if (this._log >= LOG_DEBUG)
        log(`${EXTENSION_LOG_NAME} ${why} did not find: ${window.get_id()} ${window.get_title()}`);
    }
  }
}

let _allWindowsStates;
let _interval;
let _lastSavedSize;

export default class WindowStateManager extends Extension {
  /**
   * This function is called when extension is enabled, which could be
   * done in GNOME Extensions, when you log in or when the screen is unlocked.
   */
  enable() {
    _allWindowsStates = new AllWindowsStates(LOG_LEVEL);
    _interval = GLib.timeout_add(GLib.PRIORITY_DEFAULT, 5000, () => {
      this._refreshState();
      return GLib.SOURCE_CONTINUE;
    });
  }

  /**
   * This function is called when extension is uninstalled, disabled in
   * GNOME Extensions or when the screen locks.
   */
  disable() {
    _allWindowsStates = null;
    if (_interval)
      GLib.source_remove(_interval);
  }

  /**
   * This function is called to refresh the state of the windows
   * and restore window position if needed
   */
  _refreshState() {
    const size = JSON.stringify(global.display.get_size());
    if (size != _lastSavedSize) {
      log(`${EXTENSION_LOG_NAME} Screen size changed (old: ${_lastSavedSize}, new: ${size}). Restoring saved layout...`)
      _allWindowsStates.restoreWindowPositions("AutoRestore");
    } else {
      _allWindowsStates.saveWindowPositions("AutoSave");
    }
    _lastSavedSize = size;
  }
}
