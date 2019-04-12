const fs = require('fs');

/**
 * For some reason, zeit/pkg doesn't support fs.readdir[Sync]() with
 * {withFileTypes: true} (node10-win-x86). This is a temporary solution for that.
 */
class Dirent {
    constructor(fileName, rootDirPath) {
        this.name = fileName;
        this.rootDirPath = rootDirPath;
    }
    isBlockDevice() { throw new Error('Not implemented'); }
    isCharacterDevice() { throw new Error('Not implemented'); }
    isDirectory() {
        return fs.statSync(this.rootDirPath + this.name).isDirectory();
    }
    isFIFO() { throw new Error('Not implemented'); }
    isFile() {
        return !this.isDirectory();
    }
    isSocket() { throw new Error('Not implemented'); }
    isSymbolicLink() { throw new Error('Not implemented'); }
}

exports.Dirent = Dirent;
