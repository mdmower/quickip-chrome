/**
 * @license Apache-2.0
 */

import {join as pathJoin} from 'node:path';
import {emptyDir} from 'fs-extra';
import {bold} from 'colors';
import {rootDir} from './utils.js';

(async function () {
  try {
    const distDirPath = pathJoin(rootDir, 'dist');
    await emptyDir(distDirPath);
    console.log(`${bold.green('[Clean successful]')} ${distDirPath}`);
  } catch (ex) {
    console.error(`${bold.red('[Clean error]')} Unexpected error during cleanup\n`, ex);
    process.exit(1);
  }
})();
