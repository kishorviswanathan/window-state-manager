#!/bin/sh

BASEDIR=.local/share/gnome-shell/extensions
DIR=window-state-manager@kishorv06.github.io
URL=https://github.com/kishorv06/window-state-manager.git

which git 2> /dev/null > /dev/null || ( echo Could not find Git ; exit 1 )
which gnome-shell 2> /dev/null > /dev/null || ( echo Could not find GNOME Shell ; exit 1 )

GSVERSION=$(gnome-shell --version | awk '{ print $3; }')

case $GSVERSION in
45|45.*)
	echo "Version ${GSVERSION} is supported."
	;;
*)
	echo "Unsupported GNOME version ${GSVERSION}!"
	exit
	;;
esac

cd $HOME || exit
mkdir -p ${BASEDIR} 2> /dev/null

cd ${BASEDIR} || ( echo Could not change to ${BASEDIR} ; exit 2 )

echo Using ${HOME}/${BASEDIR}/${DIR}

if [ -d ${DIR}/.git ]; then
	echo Already installed, updating...
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

echo "Restart GNOME-Shell.  For Wayland, logout and login.  For X: killall -HUP gnome-shell"
