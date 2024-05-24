/**
 * @license Apache-2.0
 */

import {mkdirSync, createWriteStream} from 'node:fs';
import {join as pathJoin} from 'node:path';
import archiver from 'archiver';
import {name, version} from '../package.json';
import minimist from 'minimist';
import {bold} from 'colors';
import {Browser, browsers, rootDir} from './utils.js';

/**
 * Package for target browser
 * @param browser Target browser
 */
async function runPackaging(browser: Browser): Promise<void> {
  const distDirPath = pathJoin(rootDir, 'dist', browser);

  // Prepare output directory
  const pkgDirPath = pathJoin(rootDir, 'pkg');
  mkdirSync(pkgDirPath, {recursive: true});

  // Prepare compressor
  const archive = archiver('zip');
  archive.on('error', function (err) {
    throw err;
  });

  // Prepare write stream
  const pkgPath = pathJoin(pkgDirPath, `${name}-${version}.${browser}.zip`);
  const wstream = createWriteStream(pkgPath, {flags: 'w'});
  wstream.on('close', function () {
    // Opting for SI unit kB rather than base 2 unit KB
    const kb = Math.round(archive.pointer() / 100) / 10;
    console.log(`${bold.green('[Pkg successful]')} Zip (${kb} kB): ${pkgPath}`);
  });

  // Begin compression
  archive.pipe(wstream);
  archive.directory(distDirPath, false);
  archive.finalize();
}

(async function () {
  try {
    const argv = minimist(process.argv.slice(2));
    const cmdlineBrowsers = argv._.filter((s): s is Browser =>
      (browsers as readonly string[]).includes(s)
    );
    const filteredBrowsers = browsers.filter(
      (browser) => !cmdlineBrowsers.length || cmdlineBrowsers.includes(browser)
    );

    for (const browser of filteredBrowsers) {
      await runPackaging(browser);
    }
  } catch (ex) {
    console.error(`${bold.red('[Pkg error]')} Unexpected error during packaging\n`, ex);
    process.exit(1);
  }
})();
