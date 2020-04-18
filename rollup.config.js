const path = require('path');
const sucrase = require('@rollup/plugin-sucrase');
const isWatch = process.env.ROLLUP_WATCH !== undefined;

////////////////////////////////////////////////////////////////////////////////
const makeOutputCfg = (...myCfg) => {
    const out = Object.assign({format: 'iife'}, ...myCfg);
    if (!out.banner) out.banner =
`/*!
 * ${out.file.split('/').pop().split('.')[0]} 0.0.0
 * https://github.com/ut4/radcms
 * @license GPLv3
 */`;
    return out;
};

const makeJsxPlugin = include =>
    sucrase({
        production: !isWatch,
        include: include || ['frontend-src/commons/components/**'],
        transforms: ['jsx'],
        jsxPragma: 'preact.createElement',
        jsxFragmentPragma: 'preact.createFragment',
    });

////////////////////////////////////////////////////////////////////////////////
module.exports = args => {
    //
    const [commonsPath, cpanelCommonsPath] = !args.configUseAbsoluteRadImports
        ? ['@rad-commons', '@rad-cpanel-commons']
        : [path.resolve(__dirname, 'frontend-src/commons/main.js'),
           path.resolve(__dirname, 'frontend-src/cpanel-commons/main.js')];
    const allGlobals = {[commonsPath]: 'radCommons', [cpanelCommonsPath]: 'radCpanelCommons'};
    const allExternals = [commonsPath, cpanelCommonsPath];
    const bundle = !args.configPlugin ? args.configBundle || 'main' : 'plugin';
    // == rad-commons.js & rad-cpanel-commons.js & rad-cpanel-app.js ===========
    if (bundle === 'main') {
        return [{
            input: 'frontend-src/commons/main.js',
            output: makeOutputCfg({
                name: 'radCommons',
                file: 'frontend/rad-commons.js'
            }),
            plugins: [makeJsxPlugin()],
            watch: {clearScreen: false}
        }, {
            input: 'frontend-src/cpanel-commons/main.js',
            output: makeOutputCfg({
                name: 'radCpanelCommons',
                file: 'frontend/rad-cpanel-commons.js',
                globals: {[commonsPath]: 'radCommons'},
            }),
            external: [commonsPath],
            plugins: [makeJsxPlugin([
                'frontend-src/cpanel-commons/src/**',
            ])],
            watch: {clearScreen: false}
        }, {
            input: 'frontend-src/cpanel-app/main.js',
            output: makeOutputCfg({
                name: 'radCpanelApp',
                file: 'frontend/rad-cpanel-app.js',
                globals: allGlobals,
            }),
            external: allExternals,
            plugins: [
                makeJsxPlugin(
                    ['frontend-src/cpanel-commons/src/**',
                     'frontend-src/cpanel-app/src/**']),
            ],
            watch: {clearScreen: false}
        }];
    }
    // == rad-install-app.js ===================================================
    if (bundle === 'installer') {
        return [{
            input: 'frontend-src/install-app/main.js',
            output: makeOutputCfg({
                file: 'frontend/rad-install-app.js',
                globals: {[commonsPath]: 'radCommons'},
            }),
            external: [commonsPath],
            plugins: [makeJsxPlugin(['frontend-src/commons/components/**',
                                     'frontend-src/install-app/src/**'])],
            watch: {clearScreen: false}
        }];
    }
    // == rad-auth-apps.js =====================================================
    if (bundle === 'auth') {
        return [{
            input: 'frontend-src/auth-apps/main.js',
            output: makeOutputCfg({
                name: 'radAuthApps',
                file: 'frontend/rad-auth-apps.js',
                globals: {[commonsPath]: 'radCommons'},
            }),
            external: [commonsPath],
            plugins: [makeJsxPlugin(['frontend-src/commons/components/**',
                                     'frontend-src/auth-apps/**'])],
            watch: {clearScreen: false}
        }];
    }
    // == some-plugin.js =======================================================
    const cfg = require(path.resolve(__dirname, args.configPlugin));
    const out = {
        input: cfg.input,
        output: makeOutputCfg({globals: allGlobals}, cfg.output),
        external: allExternals,
        plugins: [
            makeJsxPlugin([
                'frontend-src/cpanel-commons/src/**',
                'frontend-src/cpanel-app/src/**'].concat(cfg.jsxTranspile
                    ? cfg.jsxTranspile.include || []
                    : [])),
        ],
        watch: {
            clearScreen: false
        },
    };
    ['banner'].forEach(optionalKey => {
        if (cfg[optionalKey]) out[optionalKey] = cfg[optionalKey];
    });
    return out;
};
