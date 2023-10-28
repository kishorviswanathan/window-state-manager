import { Logger } from '../common/logger.js';
import { Window } from './window.js';

export class WindowStates {

    // Initializes the class with an old state, if available
    constructor(states) {
        if (states != null) {
            this.windowStates = states;
        } else {
            this.windowStates = new Map();
        }
    }

    _getWindows() {
        return global.get_window_actors().map(a => a.meta_window).filter(w => !w.is_skip_taskbar());
    }

    _getWindowStateMap() {
        // Generate key for the map
        const displaySizeKey = this.getWindowSizeKey();
        // Initialize the key, if it doesn't exist
        if (!this.windowStates.has(displaySizeKey))
            this.windowStates.set(displaySizeKey, new Map());
        // Get state for current screen
        const windowId__state = this.windowStates.get(displaySizeKey);
        Logger.debug(`Map size: ${windowId__state.size}  display size: ${displaySizeKey}`);
        return windowId__state;
    }

    getWindowSizeKey() {
        return JSON.stringify(global.display.get_size());
    }

    saveWindowPositions() {
        Logger.debug(`Saving window positions...`);
        const windowId__state = this._getWindowStateMap();
        windowId__state.clear();
        for (const window of this._getWindows())
            windowId__state.set(window.get_id(), new Window(window));
    }

    restoreWindowPositions() {
        Logger.debug(`Restoring window positions...`);
        const windowId__state = this._getWindowStateMap();
        for (const window of this._getWindows()) {
            if (windowId__state.has(window.get_id()))
                windowId__state.get(window.get_id()).restore(window);
            else
                Logger.debug(`Did not find: ${window.get_id()} ${window.get_title()}`)
        }
    }
}
