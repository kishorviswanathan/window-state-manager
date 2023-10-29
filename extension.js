import * as Main from "resource:///org/gnome/shell/ui/main.js";
import { Extension } from 'resource:///org/gnome/shell/extensions/extension.js';
import GLib from "gi://GLib";

import { Logger } from './lib/common/logger.js';
import { WindowStates } from './lib/extension/windowstate.js';

// Logging configuration
const EXTENSION_LOG_NAME = 'Window State Manager';
const LOG_LEVEL = Logger.LOG_LEVELS.INFO;

export default class WindowStateManager extends Extension {
  /**
   * This function is called when extension is enabled, which could be
   * done in GNOME Extensions, when you log in or when the screen is unlocked.
   */
  enable() {
    Logger.init(EXTENSION_LOG_NAME, LOG_LEVEL);
    Logger.info("Extension enabled.");

    this.windowStates = new WindowStates();
    this.lastRefreshedSize = 'None';

    // Monitor for session mode changes
    this._sessionId = Main.sessionMode.connect("updated", this._onSessionModeChanged.bind(this));

    // Connect signals
    this._connectSignals();

    // Refresh state initially
    this._scheduleRefresh("Extension enabled");
  }

  /**
   * This function is called when extension is uninstalled, disabled in
   * GNOME Extensions or when the screen locks.
   */
  disable() {
    /** To the reviewer and maintainer: this extension needs to persist the window data structure in memory so it has to keep running on lock screen.
    /* This is previous feature but was removed during GNOME 45 update due to the session-mode rule review.
    /* The argument is that users will expect the extension to remember window position before the screen was locked.
    /* Intent to serialize/deserialize to disk but that will take a longer time or probably a longer argument during review.
    */
    Logger.info("Extension disabled.");

    // Disconnect signals
    this._disconnectSignals();

    // Disconnect the session mode
    if (this._sessionId) {
      Main.sessionMode.disconnect(this._sessionId);
      this._sessionId = null;
    }

    // Disable pending refresh
    if (this._refreshPending) {
      GLib.source_remove(this._refreshPending);
      this._refreshPending = null;
    }

    this.lastRefreshedSize = null;
    this.windowStates = null;
  }

  /**
   * Called when the session mode changes
   */
  _onSessionModeChanged(session) {
    if (session.currentMode === "user" || session.parentMode === "user") {
      this._scheduleRefresh("Session mode changed");
    } else if (session.currentMode === "unlock-dialog") {
      /** Reason for using `unlock-dialog` is explained in the disable function.
      /* This extension doesn't monitor for any keyboard events, hence no such signals needs to be disconnected.
      /* https://gjs.guide/extensions/review-guidelines/review-guidelines.html#session-modes
      */

      // Stop any pending refreshes that were scheduled.
      if (this._refreshPending) {
        GLib.source_remove(this._refreshPending);
        this._refreshPending = null;
      }
    }
  }

  /**
   * Called when extension is enabled. This connects all required signals.
   */
  _connectSignals() {
    const display = global.display;
    const shellWm = global.window_manager;

    this._displaySignals = [
      display.connect("window-created", () => { this._scheduleRefresh("Signal: Window created"); }),
      display.connect("grab-op-end", () => { this._scheduleRefresh("Signal: Grab operation ended"); }),
      display.connect("window-entered-monitor", () => { this._scheduleRefresh("Signal: Window entered monitor"); }),
      display.connect("in-fullscreen-changed", () => { this._scheduleRefresh("Signal: In fullscreen changed"); })
    ];

    this._wmSignals = [
      shellWm.connect("size-changed", () => { this._scheduleRefresh("Signal: Size changed"); }),
      shellWm.connect("minimize", () => { this._scheduleRefresh("Signal: Minimize"); }),
      shellWm.connect("unminimize", () => { this._scheduleRefresh("Signal: Unminimize"); })
    ]

    this._lmSignals = [
      Main.layoutManager.connect("monitors-changed", () => { this._scheduleRefresh("Signal: Monitors changed"); })
    ]
  }

  /**
   * Called when extension is disabled. This disconnects all signals.
   */
  _disconnectSignals() {
    if (this._displaySignals) {
      for (const displaySignal of this._displaySignals) {
        global.display.disconnect(displaySignal);
      }
      this._displaySignals.length = 0;
      this._displaySignals = undefined;
    }

    if (this._wmSignals) {
      for (const windowManagerSignal of this._wmSignals) {
        global.window_manager.disconnect(windowManagerSignal);
      }
      this._wmSignals.length = 0;
      this._wmSignals = undefined;
    }

    if (this._lmSignals) {
      for (const layoutManagerSignal of this._lmSignals) {
        Main.layoutManager.disconnect(layoutManagerSignal);
      }
      this._lmSignals.length = 0;
      this._lmSignals = undefined;
    }
  }

  /**
   * This function ensures that the _refreshState function won't be called
   * multiple times. This occurs when the layout is restored and that triggers
   * one or more of the signals. This function will schedule the refresh after a
   * few seconds and all events during this period is ignored.
   */
  _scheduleRefresh(reason) {
    if (this._refreshPending) return

    Logger.debug(`Refresh scheduled. Reason: ${reason}`);

    // Group events triggred together and run refresh once
    this._refreshPending = GLib.timeout_add(GLib.PRIORITY_DEFAULT, 2000, () => {
      this._refreshState();
      this._refreshPending = null;
      return GLib.SOURCE_REMOVE;
    });
  }

  /**
   * This function is called to refresh the state of the windows
   * and restore window position if needed
   */
  _refreshState() {
    // Get the current screen size
    const size = this.windowStates?.getWindowSizeKey();

    if (size != this.lastRefreshedSize) {
      Logger.info(`Screen size changed (${this.lastRefreshedSize} => ${size}). Restoring saved layout...`);
      this.windowStates?.restoreWindowPositions();
    } else {
      this.windowStates?.saveWindowPositions();
    }
    this.lastRefreshedSize = size;
  }
}
