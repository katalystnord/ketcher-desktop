#!/bin/bash
# Post-install: register AppStream metainfo so software centres can find the app.
set -e
mkdir -p /usr/share/metainfo
cp "/opt/Ketcher Desktop/usr/share/metainfo/com.ketcher.desktop.metainfo.xml" \
   /usr/share/metainfo/com.ketcher.desktop.metainfo.xml
