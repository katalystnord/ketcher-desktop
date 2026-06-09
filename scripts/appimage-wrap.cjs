// electron-builder afterPack hook.
// Wraps the Linux binary in a shell script that prepends --no-sandbox.
// app.commandLine.appendSwitch('no-sandbox') runs too late (after Electron's
// C++ sandbox check); the flag must reach the binary before it initialises.
const fs = require('fs');
const path = require('path');

exports.default = async function afterPack(context) {
  if (context.electronPlatformName !== 'linux') return;

  const appOutDir = context.appOutDir;
  const exeName = context.packager.executableName;
  const binPath = path.join(appOutDir, exeName);

  if (!fs.existsSync(binPath)) {
    console.warn(`[afterPack] Binary not found at ${binPath} — skipping wrap`);
    return;
  }

  fs.renameSync(binPath, binPath + '.bin');

  fs.writeFileSync(
    binPath,
    `#!/bin/bash\nexec "$(dirname "$(readlink -f "$0")")/${exeName}.bin" --no-sandbox "$@"\n`,
  );
  fs.chmodSync(binPath, 0o755);

  console.log(`[afterPack] Wrapped ${exeName} with --no-sandbox`);
};
