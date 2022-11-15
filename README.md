Window State Manager extension for GNOME Shell
=====================================================================

About
-----
Window State Manager is a GNOME Shell extension to monitor window states (position on monitor, location, size, etc.) and restore them automatically to their previous positions when a change in layout occurs. It was created to solve an issue with GNOME on wayland where some programs won't remember their positions when device is docked and undocked.

### Limitations
 * Restore does not manage which windows are on top.  However, in testing to date the correct windows have always been shown on top.
 * Window state is saved every 5 seconds. So if a window was created or moved just before removing the device from dock, it's state might not get preserved.
 * State is saved in memory and is not preserved across restarts.

Configuration
-------------
There is nothing to configure.

Installation
------------
To install this extension you can either
 * use http://extensions.gnome.org (caution: it may not contain the most recent versions)
 * use the GNOME Shell Extension Manager
 * copy it under ~/.local/share/gnome-shell/extensions/window-state-manager@kishorv06.github.io/ in your home directory
 * use the install.sh script to install automatically

Note: you may have to explicitly enable the extension using the GNOME Shell Extension Manager after installation.

Compatibility
-------------
This extension has been tested on GNOME 42 and 43.

License
-------
This extension is released under the GNU Public License version 2.
