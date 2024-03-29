/**
 * @license Apache-2.0
 */

const packageJson = require('../package.json');

module.exports = {
  action: {
    default_icon: {
      16: 'icons/icon16.png',
      19: 'icons/icon19.png',
      24: 'icons/icon24.png',
      32: 'icons/icon32.png',
      38: 'icons/icon38.png',
      48: 'icons/icon48.png',
    },
    default_popup: 'bubble.html',
    default_title: 'Find your IP',
  },
  commands: {
    'quick-copy-ipv4': {
      suggested_key: {
        default: 'Ctrl+Shift+4',
        mac: 'Command+Shift+4',
      },
      description: 'Copy IPv4 to clipboard',
    },
    'quick-copy-ipv6': {
      suggested_key: {
        default: 'Ctrl+Shift+6',
        mac: 'Command+Shift+6',
      },
      description: 'Copy IPv6 to clipboard',
    },
  },
  description: 'Quickly find and copy your public IPv4 and IPv6 addresses',
  icons: {
    16: 'icons/icon16.png',
    19: 'icons/icon19.png',
    24: 'icons/icon24.png',
    32: 'icons/icon32.png',
    38: 'icons/icon38.png',
    48: 'icons/icon48.png',
    128: 'icons/icon128.png',
  },
  manifest_version: 3,
  name: 'QuickIP',
  permissions: ['clipboardWrite', 'storage'],
  host_permissions: [
    'https://*.ipify.org/',
    'https://*.ident.me/',
    'https://*.icanhazip.com/',
    'https://*.wtfismyip.com/',
  ],
  version: packageJson.version,
};
