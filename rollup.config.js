// Command: node node_modules/rollup/dist/bin/rollup -c rollup.config.js --configBundle commons|cpanel
const path = require('path');

module.exports = args => {
    const commonsPath = path.resolve(__dirname, 'frontend/rad-commons.js');
    const bundleName = args.configBundle;
    const cfg = {
        commons: {
            input: 'frontend/commons/main.js',
            version: '0.0.0',
        },
        cpanel: {
            input: 'frontend/cpanel-app/main.js',
            external: [commonsPath],
            globals: {[commonsPath]: 'radCommons'},
            version: '0.0.0',
        },
    }[bundleName];
    if (!cfg) {
        throw new Error(`--configBundle must be ${Object.keys(cfg).join(', ')}.`);
    }
    const resultGlobalVarName = 'rad' + bundleName.charAt(0).toUpperCase() + bundleName.substr(1);
    const out = {
        input: cfg.input,
        output: {
            name: resultGlobalVarName,
            file: `frontend/rad-${bundleName}.bundle.js`,
            format: 'iife',
            banner:
`/*!
 * rad-${bundleName} ${cfg.version}
 * https://github.com/ut4/radcms
 * @license GPLv2
 */`
        }
    };
    if (cfg.external)
        out.external = cfg.external;
    if (cfg.globals)
        out.output.globals = cfg.globals;
    return out;
};
