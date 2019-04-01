/**
 * # app.js
 *
 * This file contains the global state of RadCMS.
 *
 */
const DATA_DIR_NAME = 'radcms';

let app = {
    homePath: '',
    dataPath: '',
    initAndInstall() {
        //
    },
    log(...args) {
        /* eslint-disable no-console */
        console.log(...args);
    }
};

if (process.env.APPDATA) { // win
    // C:/Users/<user>/AppData/Roaming/radcms/
    app.dataPath = normalizePath(process.env.APPDATA) + DATA_DIR_NAME + '/';
    app.homePath = app.dataPath.split('/').slice(0, 5).join('/'); // 5==['c','','users','<user>',''].length
} else if (process.platform === 'darwin') { // macOs
    // /Users/<user>/
    app.homePath = normalizePath(process.env.HOME);
    app.dataPath = app.homePath + 'Library/Preferences/' + DATA_DIR_NAME + '/';
} else if (process.platform === 'linux') {
    // /home/<user>/
    app.homePath = normalizePath(process.env.HOME);
    app.dataPath = app.homePath + '.config/' + DATA_DIR_NAME + '/';
} else {
    throw new Error('Unsupported platform "' + process.platform + '".');
}

////////////////////////////////////////////////////////////////////////////////

function normalizePath(path) {
    path = path.split('\\').join('/');
    return path.charAt(path.length - 1) === '/' ? path : path + '/';
}

exports.app = app;
