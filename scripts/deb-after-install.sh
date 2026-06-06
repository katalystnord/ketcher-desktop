#!/bin/bash
# Post-install: register AppStream metainfo and refresh desktop/MIME databases.
set -e

mkdir -p /usr/share/metainfo
cp "/opt/Ketcher Desktop/usr/share/metainfo/com.ketcher.desktop.metainfo.xml" \
   /usr/share/metainfo/com.ketcher.desktop.metainfo.xml

# Refresh so MimeType= associations in the .desktop file take effect immediately.
update-desktop-database /usr/share/applications 2>/dev/null || true
