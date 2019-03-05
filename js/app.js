var commons = require('common-services.js');
var Website = require('website.js').Website;

exports.app = {
    db: null,
    currentWebsite: null,
    initAndInstall: function() {
        this.db = new commons.Db(insnEnv.dataPath + 'data.db');
        this.populateDatabaseIfEmpty();
    },
    /**
     * Populates $insnEnv.appPath/data.db, or does nothing if the file was
     * already populated.
     *
     * @native
     */
    populateDatabaseIfEmpty: function() {},
    setCurrentWebsite: function(dirPath, dbUrl) {
        this.currentWebsite = new Website(dirPath, dbUrl);
    }
};
