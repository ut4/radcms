// Command: node node_modules/rollup/dist/bin/rollup -c rollup.config.js --configBundle commons|cpanel|cpanel-boot|my-plugin-main [--configVersion 0.0.1]
const path = require('path');

module.exports = args => {
    const commonsPath = path.resolve(__dirname, 'frontend/rad-commons.js');
    const cpanelPath = path.resolve(__dirname, 'frontend/rad-cpanel.js');
    const inputBundleName = args.configBundle;
    if (!inputBundleName) {
        throw new Error('--configBundle must be commons,cpanel,cpanel-boot or my-plugin-main.');
    }
    let isUserBundle = false, cfg;
    if (inputBundleName === 'commons') {
        cfg = {
            input: 'frontend/commons/main.js',
            version: '0.0.0',
        };
    } else if (inputBundleName === 'cpanel') {
        cfg = {
            input: 'frontend/cpanel-app/main.js',
            external: [commonsPath],
            globals: {[commonsPath]: 'radCommons'},
            version: '0.0.0',
        };
    } else {
        isUserBundle = inputBundleName !== 'cpanel-boot';
        cfg = {
            input: !isUserBundle
                ? 'frontend/cpanel-app/boot.js'
                : inputBundleName + '.js',
            external: [commonsPath, cpanelPath],
            globals: {[commonsPath]: 'radCommons',
                      [cpanelPath]: 'radCpanel'},
            version: args.configVersion || '0.0.0',
        };
    }
    const bundleName = inputBundleName.split('-').map(cap).join('');
    const resultGlobalVarName = !isUserBundle ? 'rad' + cap(bundleName) : bundleName;
    const resultFileName = (!isUserBundle ? 'rad-' : '') + inputBundleName;
    const out = {
        input: cfg.input,
        output: {
            name: resultGlobalVarName,
            file: `${!isUserBundle ? 'frontend/' : ''}${resultFileName}.bundle.js`,
            format: 'iife',
            banner: !isUserBundle
                ?
`/*!
 * ${resultFileName} ${cfg.version}
 * https://github.com/ut4/radcms
 * @license GPLv2
 */`
                :
`/*!
 * ${resultFileName} ${cfg.version}
 */`
        }
    };
    if (cfg.external)
        out.external = cfg.external;
    if (cfg.globals)
        out.output.globals = cfg.globals;
    return out;
};

function cap(str) {
    return str.charAt(0).toUpperCase() + str.substr(1);
}
