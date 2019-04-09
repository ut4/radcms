const {Stub} = require('./env.js');
const {Uploader, FTPResponseCode} = require('../src/common-services.js');

QUnit.module('[\'common-services.js\'].Uploader', hooks => {
    let uploader;
    hooks.beforeEach(() => {
        uploader = new Uploader();
        uploader.remoteUrl = {pathname: 'ftp://foo.com'};
    });
    QUnit.test('delete (asFile) deletes a file', assert => {
        assert.expect(1);
        const removeStub = new Stub(uploader.client, 'remove',
            () => Promise.resolve({code: FTPResponseCode.TRANSFER_COMPLETE}));
        const asDir = false;
        const path = '/file.htm';
        const done = assert.async();
        uploader.delete(path, asDir).then(() => {
            assert.equal(removeStub.callInfo[0][0], uploader.remoteUrl.pathname + path);
            done();
        });
    });
    QUnit.test('delete (asDir) deletes a directory', assert => {
        assert.expect(1);
        const removeStub = new Stub(uploader.client, 'removeDir',
            () => Promise.resolve({code: FTPResponseCode.TRANSFER_COMPLETE}));
        const asDir = true;
        const path = '/dir/file.htm';
        const done = assert.async();
        uploader.delete(path, asDir).then(() => {
            assert.equal(removeStub.callInfo[0][0], uploader.remoteUrl.pathname + path.substr(0, 4));
            done();
        });
    });
});
