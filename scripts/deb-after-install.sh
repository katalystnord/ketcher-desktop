#!/bin/bash
# Post-install: register AppStream metainfo and refresh desktop/MIME databases.
set -e

mkdir -p /usr/share/metainfo
cp "/opt/Ketcher Desktop/usr/share/metainfo/com.ketcher.desktop.metainfo.xml" \
   /usr/share/metainfo/com.ketcher.desktop.metainfo.xml

# Ubuntu 24.04+ blocks unprivileged user namespaces, which Electron's Chrome
# sandbox requires. Patch the desktop file to pass --no-sandbox at launch.
DESKTOP_FILE="/usr/share/applications/ketcher-desktop.desktop"
if [ -f "$DESKTOP_FILE" ]; then
    sed -i 's|^Exec=\(.*\) %U$|Exec=\1 --no-sandbox %U|' "$DESKTOP_FILE"
fi

# Refresh so MimeType= associations in the .desktop file take effect immediately.
update-desktop-database /usr/share/applications 2>/dev/null || true
