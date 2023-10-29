import * as Main from "resource:///org/gnome/shell/ui/main.js";
import { Extension } from 'resource:///org/gnome/shell/extensions/extension.js';
import GLib from "gi://GLib";

import { Logger } from './lib/common/logger.js';
import { WindowStates } from './lib/extension/windowstate.js';

// Logging configuration
const EXTENSION_LOG_NAME = 'Window State Manager';
const LOG_LEVEL = Logger.LOG_LEVELS.DEBUG;

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

    // Connect signals
    this._connectSignals();
  }

  /**
   * This function is called when extension is uninstalled, disabled in
   * GNOME Extensions or when the screen locks.
   */
  disable() {
    Logger.info("Extension disabled.");

    // Disconnect signals
    this._disconnectSignals();

    // Disable pending refresh
    if (this._refreshPending) {
      GLib.source_remove(this._refreshPending);
      this._refreshPending = null;
    }

    this.lastRefreshedSize = null;
    this.windowStates = null;
  }

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

  // Schedule refresh
  _scheduleRefresh(reason) {
    if (this._refreshPending) return

    Logger.debug(`Refresh scheduled. Reason: ${reason}`);

    // Group events triggred together and run refresh once
    this._refreshPending = GLib.timeout_add(GLib.PRIORITY_DEFAULT, 5000, () => {
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
