#!/bin/bash
# Post-remove: clean up AppStream metainfo and refresh desktop database.
rm -f /usr/share/metainfo/com.ketcher.desktop.metainfo.xml
update-desktop-database /usr/share/applications 2>/dev/null || true
