/**
 * @license Apache-2.0
 */

import {join as pathJoin} from 'node:path';
import {readdir, copyFile, readFile, writeFile, copy, existsSync, mkdirSync} from 'fs-extra';
import {minify} from 'html-minifier-terser';
import webpack from 'webpack';
import minimist from 'minimist';
import {bold} from 'colors';
import deepmerge from 'deepmerge';
import {webpackConfig} from './webpack.js';
import {manifest} from './manifest.js';
import {Browser, browsers, rootDir} from './utils.js';

/**
 * Minify HTML
 * @param debug Whether to run in debug mode
 * @param browser Target browser
 * @param distDirPath Path to destination dir
 */
async function minifyHtml(debug: boolean, browser: Browser, distDirPath: string): Promise<unknown> {
  try {
    const htmlDirPath = pathJoin(rootDir, 'html');
    const filenames = (await readdir(htmlDirPath)).filter((filename) => {
      if (browser === 'firefox') {
        return !['offscreen.html'].includes(filename);
      }
      return true;
    });
    const htmlFiles = filenames
      .filter((filename) => /\.html?$/i.test(filename))
      .map((filename) => {
        return {
          filename: filename,
          inputPath: pathJoin(htmlDirPath, filename),
          outputPath: pathJoin(distDirPath, filename),
        };
      });

    if (debug) {
      console.log(`${bold.green('[Copying HTML]')} ${filenames.join(', ')}`);
      return Promise.all(
        htmlFiles.map(async (htmlFile) => {
          return copyFile(htmlFile.inputPath, htmlFile.outputPath);
        })
      );
    }

    console.log(`${bold.green('[Minifying HTML]')} ${filenames.join(', ')}`);
    return Promise.all(
      htmlFiles.map(async (htmlFile) => {
        const html = await readFile(htmlFile.inputPath, 'utf-8');
        const minHtml = await minify(html, {
          collapseBooleanAttributes: true,
          collapseWhitespace: true,
          conservativeCollapse: true,
          decodeEntities: true,
          removeComments: true,
        });

        return writeFile(htmlFile.outputPath, minHtml, 'utf-8');
      })
    );
  } catch (ex) {
    console.error(bold.red(`[Build error] Unexpected error in ${minifyHtml.name}`) + '\n', ex);
  }

  return Promise.reject();
}

/**
 * Copy static files
 * @param debug Whether to run in debug mode
 * @param browser Target browser
 * @param distDirPath Path to destination dir
 */
async function copyStaticFiles(
  debug: boolean,
  browser: string,
  distDirPath: string
): Promise<unknown> {
  try {
    const staticDirPath = pathJoin(rootDir, 'static');
    const itemnames = await readdir(staticDirPath);
    const dirContents = itemnames.map((itemname) => {
      return {
        itemname: itemname,
        inputPath: pathJoin(staticDirPath, itemname),
        outputPath: pathJoin(distDirPath, itemname),
      };
    });

    console.log(`${bold.green('[Copying static files]')} ${itemnames.join(', ')}`);
    return Promise.all(dirContents.map((item) => copy(item.inputPath, item.outputPath)));
  } catch (ex) {
    console.error(bold.red(`[Build error] Unexpected error in ${copyStaticFiles.name}`) + '\n', ex);
  }

  return Promise.reject();
}

/**
 * Write manifest.json
 * @param debug Whether to run in debug mode
 * @param browser Target browser
 * @param distDirPath Path to destination dir
 */
async function writeManifest(debug: boolean, browser: Browser, distDirPath: string): Promise<void> {
  try {
    let manifestObj = manifest[browser];

    // If local.manifest.json exists and this is a debug build, merge into manifest.
    if (debug) {
      const localManifestPath = pathJoin(rootDir, 'local.manifest.json');
      if (existsSync(localManifestPath)) {
        const localManifestJson = await readFile(localManifestPath, 'utf-8');
        const localManifestObj = JSON.parse(localManifestJson) as chrome.runtime.ManifestV3;
        if (browser == 'firefox' && 'key' in localManifestObj) {
          delete localManifestObj.key;
        }
        manifestObj = deepmerge(manifestObj, localManifestObj);
      }
    }

    const manifestJson = JSON.stringify(manifestObj, undefined, debug ? 2 : undefined);
    const mainfestPath = pathJoin(distDirPath, 'manifest.json');
    console.log(bold.green('[Writing manifest] manifest.json'));
    return writeFile(mainfestPath, manifestJson, 'utf-8');
  } catch (ex) {
    console.error(bold.red(`[Build error] Unexpected error in ${writeManifest.name}`) + '\n', ex);
  }

  return Promise.reject();
}

/**
 * Compile JS for browser target
 * @param debug Whether to run in debug mode
 * @param browser Target browser
 * @param distDirPath Path to destination dir
 */
async function compileJs(debug: boolean, browser: Browser, distDirPath: string): Promise<void> {
  try {
    const config = webpackConfig[browser];
    config.output ||= {};
    config.output.path = distDirPath;

    if (debug) {
      config.mode = 'development';
      config.devtool = 'inline-source-map';
    }

    config.entry ||= {};
    const filenames = Object.keys(config.entry).map((entry) => `${entry}.js`);
    console.log(`${bold.green('[Compiling JS]')} ${filenames.join(', ')}\n`);
    const compiler = webpack(config);
    await new Promise<void>((resolve, reject) => {
      compiler.run((err, stats) => {
        if (err) {
          console.error(bold.red('[Webpack error] Config failure') + '\n', err.stack || err);
          if ('details' in err && err.details) {
            console.error(err.details);
          }
          return reject();
        }
        if (!stats) {
          return reject();
        }

        console.log(
          stats.toString({
            chunks: false,
            colors: true,
          })
        );

        return stats.hasErrors() ? reject() : resolve();
      });
    });

    return Promise.resolve();
  } catch (ex) {
    const redMsg = bold.red(`[Build error] Compilation error in ${compileJs.name}`);
    if (ex !== undefined) {
      console.error(redMsg + '\n', ex);
    } else {
      console.error(redMsg);
    }
  }

  return Promise.reject();
}

// Build all the things
(async function () {
  let debug = false;
  const distDirPaths: Partial<Record<Browser, string>> = {};
  const filteredBrowsers: Browser[] = [];

  try {
    // Read flags
    const argv = minimist<{debug: boolean}>(process.argv.slice(2), {
      boolean: ['debug'],
    });

    // Set build mode
    debug = argv.debug;
    if (debug) {
      console.warn(bold.yellow('Debug mode enabled'));
    }

    const cmdlineBrowsers = argv._.filter((s): s is Browser =>
      (browsers as readonly string[]).includes(s)
    );
    filteredBrowsers.push(
      ...browsers.filter((browser) => !cmdlineBrowsers.length || cmdlineBrowsers.includes(browser))
    );

    // Prepare output directories
    for (const browser of filteredBrowsers) {
      const outPath = pathJoin(rootDir, 'dist', browser);
      distDirPaths[browser] = outPath;
      mkdirSync(outPath, {recursive: true});
    }
  } catch (ex) {
    console.error(bold.red(`[Build error] Unexpected error preparing for build`) + '\n', ex);
    process.exit(1);
  }

  // Error output is handled within each method, no need to re-output here.
  try {
    for (const browser of filteredBrowsers) {
      console.log(`\n${bold.cyan('Building for ' + browser)}`);
      const outPath = distDirPaths[browser] as string;
      await Promise.all([
        minifyHtml(debug, browser, outPath),
        copyStaticFiles(debug, browser, outPath),
        writeManifest(debug, browser, outPath),
      ]);
      // Keep compilation logs together by calling compileJs independently
      await compileJs(debug, browser, outPath);

      console.log(`\n${bold.green('[Build successful]')} ${outPath}`);
    }
  } catch (ex) {
    process.exit(1);
  }
})();
