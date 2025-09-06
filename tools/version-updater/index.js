const { version } = require('../../package.json');
const fs = require('fs');
fs.writeFileSync(
    'src/environments/version.ts',
    `export const appVersion = '${version}';\n`
);