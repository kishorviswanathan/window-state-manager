import Meta from "gi://Meta";

import { Logger } from '../common/logger.js';

// This class stores the state of a window
export class Window {
    constructor(window) {
        this._rect = window.get_frame_rect();
        this._maximized = window.get_maximized();
        this._minimized = window.minimized;
        this._workspace = window.get_workspace().index();

        // The following are only used for logging
        this._fullscreen = window.fullscreen;
        this._id = window.get_id();
        this._title = window.get_title();
    }

    toString() {
        const r = this._rect;
        return `x:${r.x}, y:${r.y}, w:${r.width}, h:${r.height}, isMaximized:${this._maximized}, ` +
            `isMinimized:${this._minimized}, isFullscreen:${this._fullscreen}, id:${this._id}, title:${this._title}, workspace:${this._workspace}`;
    }

    restore(currentWindow) {
        this._configureWorkspace(currentWindow, this._workspace);
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

    _configureWorkspace(window, workspace) {
        if (workspace != window.get_workspace().index()) {
            window.change_workspace_by_index(workspace, true);
        }
    }

    _logDifferences(window) {
        let hasDiffs = false;
        if (window.minimized !== this._minimized) {
            Logger.debug(`Wrong minimized: ${window.minimized()}, title:${this._title}`);
            hasDiffs = true;
        }
        if (window.get_maximized() !== this._maximized) {
            Logger.debug(`Wrong maximized: ${window.get_maximized()}, title:${this._title}`);
            hasDiffs = true;
        }
        // This test fails when there is a difference between saved and current maximization, though the window
        // behaviour is correct.  Due to an asynchronous update?
        if (!this._equalRect(window)) {
            const r = window.get_frame_rect();
            Logger.debug(`Wrong rectangle: x:${r.x}, y:${r.y}, w:${r.width}, h:${r.height}, title:${this._title}`);
            hasDiffs = true;
        }
        if (hasDiffs)
            Logger.debug(`Expecting: ${this}`);
    }
}
