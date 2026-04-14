#!/bin/bash
set -e

PLIST_NAME="com.gbrain.serve.plist"
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
SOURCE="$SCRIPT_DIR/$PLIST_NAME"
DEST="$HOME/Library/LaunchAgents/$PLIST_NAME"

mkdir -p "$HOME/Library/LaunchAgents"
cp "$SOURCE" "$DEST"
echo "Copied plist to $DEST"

launchctl load "$DEST"
echo "Loaded $PLIST_NAME — gbrain serve is now running and will auto-start on login."
