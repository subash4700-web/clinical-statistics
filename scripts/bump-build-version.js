const fs = require('fs');
const path = require('path');

const rootDir = path.resolve(__dirname, '..');
const packageJsonPath = path.join(rootDir, 'package.json');
const versionJsPath = path.join(rootDir, 'assets', 'js', 'version.js');

function parseVersion(version) {
  const match = /^(\d+)\.(\d+)\.(\d+)$/.exec(version || '');
  if (!match) {
    throw new Error(`Unsupported version format: ${version}. Expected x.y.z`);
  }
  return {
    major: Number(match[1]),
    minor: Number(match[2]),
    patch: Number(match[3])
  };
}

function run() {
  const packageRaw = fs.readFileSync(packageJsonPath, 'utf8');
  const packageJson = JSON.parse(packageRaw);

  const current = parseVersion(packageJson.version);
  const nextVersion = `${current.major}.${current.minor}.${current.patch + 1}`;

  packageJson.version = nextVersion;
  fs.writeFileSync(packageJsonPath, `${JSON.stringify(packageJson, null, 2)}\n`, 'utf8');

  const versionJs = `window.APP_META = Object.freeze({\n  version: '${nextVersion}',\n  build: ${current.patch + 1}\n});\n`;
  fs.writeFileSync(versionJsPath, versionJs, 'utf8');

  console.log(`Version bumped: ${current.major}.${current.minor}.${current.patch} -> ${nextVersion}`);
}

run();
