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

    this.lastRefreshedSize = null;
    this.windowStates = null;
  }

  _connectSignals() {
    const display = global.display;
    const shellWm = global.window_manager;

    this._displaySignals = [
      display.connect("window-created", () => {
        Logger.debug("Signal: Window created");
        this._refreshState();
      }),
      display.connect("grab-op-end", () => {
        Logger.debug("Signal: Grab operation ended");
        this._refreshState();
      }),
      display.connect("window-entered-monitor", () => {
        Logger.debug("Signal: Window entered monitor");
        this._refreshState();
      }),
      display.connect("in-fullscreen-changed", () => {
        Logger.debug("Signal: In fullscreen changed");
        this._refreshState();
      })
    ];

    this._wmSignals = [
      shellWm.connect("minimize", () => {
        Logger.debug("Signal: Minimize");
        this._refreshState();
      }),
      shellWm.connect("unminimize", () => {
        Logger.debug("Signal: Unminimize");
        this._refreshState();
      })
    ]

    this._lmSignals = [
      Main.layoutManager.connect("monitors-changed", () => {
        Logger.debug("Signal: Monitors changed")
        this._refreshState();
      })
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
