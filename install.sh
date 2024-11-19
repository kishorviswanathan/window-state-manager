#!/bin/bash -e

BASEDIR="$HOME/.local/share/gnome-shell/extensions"
DIR="window-state-manager@kishorv06.github.io"
URL="https://github.com/kishorv06/window-state-manager.git"

which gnome-shell 2> /dev/null > /dev/null || ( echo Could not find GNOME Shell ; exit 1 )

GSVERSION=$(gnome-shell --version | awk '{ print $3; }')

case $GSVERSION in
45|45.*|46|46.*|47|47.*)
	echo "Version ${GSVERSION} is supported."
	;;
*)
	echo "Unsupported GNOME version ${GSVERSION}!"
	exit
	;;
esac

mkdir -p ${BASEDIR} 2> /dev/null
echo "Installing to ${BASEDIR}/${DIR}..."

if [ "$1" == "--install-from-local" ]; then
	# Install from current directory
	mkdir -p "${BASEDIR}/${DIR}" 2> /dev/null
	rsync -r --exclude '.git' . "${BASEDIR}/${DIR}"
else
	# Install from git
	which git 2> /dev/null > /dev/null || ( echo Could not find Git ; exit 1 )

	cd ${BASEDIR} || ( echo Could not change to ${BASEDIR} ; exit 2 )

	if [ -d ${DIR}/.git ]; then
		echo "Extension already installed. Updating..."
		cd ${DIR} || exit
		git pull
	else
		if [ -d ${DIR} ]; then
			echo Found a previous installation.
			echo If you are sure you want to replace it, please delete this folder and retry.
			exit 4
		else
			git clone ${URL} ${DIR} || exit 3
		fi
	fi
fi

echo "Restart GNOME-Shell.  For Wayland, logout and login.  For X: killall -HUP gnome-shell"
