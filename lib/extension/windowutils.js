import Meta from "gi://Meta";

// Utility functions to manipulate windows
export class WindowUtils {
    // For a given window, return its properties we are interested
    static getState(window) {
        return {
            rect: window.get_frame_rect(),
            maximized: window.get_maximized(),
            minimized: window.minimized
        }
    }

    // Restore given window from it's properties
    static restoreState(window, state) {
        if (!this._equalRect(window, state)) {
            if (window.get_maximized())
                window.unmaximize(Meta.MaximizeFlags.BOTH);
            this._moveResizeFrame(window, state);
        }
        this._setMaximized(window, state);
        this._setMinimized(window, state);
    }

    // Check if the window matches given rectangle
    static _equalRect(window, state) {
        const r = window.get_frame_rect();
        return state.rect.x === r.x && state.rect.y === r.y &&
            state.rect.width === r.width && state.rect.height === r.height;
    }

    // Move or resize given window to match saved state
    static _moveResizeFrame(window, state) {
        // Is it correct to set user_op => true?  Is this performing a user operation?
        window.move_resize_frame(true, state.rect.x, state.rect.y, state.rect.width, state.rect.height);
    }

    // Restore window's maximized or minimized state
    static _setMaximized(window, state) {
        if (window.get_maximized() !== state.maximized) {
            if (state.maximized)
                window.maximize(state.maximized);
            else
                window.unmaximize(Meta.MaximizeFlags.BOTH);
        }
    }

    static _setMinimized(window, state) {
        if (window.minimized !== state.minimized) {
            if (state.minimized)
                window.minimize();
            else
                window.unminimize();
        }
    }
}
