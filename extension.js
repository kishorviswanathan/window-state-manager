import { Extension } from 'resource:///org/gnome/shell/extensions/extension.js';
import GLib from "gi://GLib";

import { Logger } from './lib/common/logger.js';
import { WindowStates } from './lib/extension/windowstate.js';

// Logging configuration
const EXTENSION_LOG_NAME = 'Window State Manager';
const LOG_LEVEL = Logger.LOG_LEVELS.INFO;

const REFRESH_INTERVAL = 5000;

export default class WindowStateManager extends Extension {
  /**
   * This function is called when extension is enabled, which could be
   * done in GNOME Extensions, when you log in or when the screen is unlocked.
   */
  enable() {
    Logger.init(EXTENSION_LOG_NAME, LOG_LEVEL);
    Logger.info("Enabling...");

    // Load window states from settings
    this.stateSettings = this.getSetttings('org.gnome.shell.extensions.windowstatemanager.states');

    try {
      const savedWindowStates = JSON.parse(this.stateSettings.get_string('window-states'));
      this.windowStates = new WindowStates(savedWindowStates);
      Logger.info("Restored window states from disk.");
    } catch {
      this.windowStates = new WindowStates();
      this.lastRefreshedSize = 'None';
    }

    // Start timer to refresh window states
    this.refreshInterval = GLib.timeout_add(GLib.PRIORITY_DEFAULT, REFRESH_INTERVAL, () => {
      this._refreshState();
      return GLib.SOURCE_CONTINUE;
    });
  }

  /**
   * This function is called when extension is uninstalled, disabled in
   * GNOME Extensions or when the screen locks.
   */
  disable() {
    Logger.info("Disabling...");

    // Save window states to disk
    Logger.info("Saving window states to disk...");
    this.stateSettings?.set_string('window-states', this.windowStates?.getState())

    // Disable the timer
    if (this.refreshInterval)
      GLib.source_remove(this.refreshInterval);

    this.stateSettings = null;
    this.lastRefreshedSize = null;
    this.windowStates = null;
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
