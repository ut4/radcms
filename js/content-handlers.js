var commons = require('common-services.js');
var http = require('http.js');
var website = require('website.js');

commons.app.addRoute(function(url, method) {
    if (method == 'GET') {
        if (url == '/api/content-type')
            return handleGetAllContentTypesRequest;
        if (url.indexOf('/api/content-type/') > -1)
            return handleGetContentTypeRequest;
        if (url.indexOf('/api/content/') > -1)
            return handleGetContentNodeRequest;
    }
    if (method == 'POST' && url == '/api/content')
        return handleCreateContentRequest;
    if (method == 'PUT' && url == '/api/content')
        return handleUpdateContentRequest;
});

/**
 * GET /api/content/<id>: returns a content node.
 *
 * Example response:
 * {
 *     "id": 25,
 *     "name": "foo",
 *     "json": "{"title":"Hello","body":"Foo bar.."}",
 *     "contentTypeName": "Article",
 * }
 */
function handleGetContentNodeRequest(req) {
    var sql = 'select id,`name`,`json`,`contentTypeName` from contentNodes where id = ?';
    var out = null;
    commons.db.select(sql, function(row) {
        out = {
            id: row.getInt(0),
            name: row.getString(1),
            json: row.getString(2),
            contentTypeName: row.getString(3)
        };
    }, function(stmt) {
        stmt.bindInt(0, parseInt(req.url.split('/').pop()));
    });
    if (out) return new http.Response(200, JSON.stringify(out), {
        'Content-Type': 'application/json'
    });
    return new http.Response(400, 'Content node not found');
}

/**
 * POST /api/content: inserts a new content node to the database.
 *
 * Payload:
 * name=string|required&
 * json=string|required&
 * contentTypeName=string|required
 *
 * Example response:
 * {"insertId":1}
 */
function handleCreateContentRequest(req) {
    var errs = [];
    if (!validateReqData(req.data, errs)) return new http.Response(400, errs.join('\n'));
    //
    var insertId = commons.db.insert(
        'insert into contentNodes (`name`, `json`, `contentTypeName`) values (?, ?, ?)',
        function(stmt) {
        stmt.bindString(0, req.data.name);
        stmt.bindString(1, req.data.json);
        stmt.bindString(2, req.data.contentTypeName);
    });
    //
    return new http.Response(200, JSON.stringify({insertId: insertId}), {
        'Content-Type': 'application/json'
    });
}

/**
 * PUT /api/content: writes updated content node to the database.
 *
 * Payload:
 * @see handleCreateContentRequest
 *
 * Example response:
 * {"numAffectedRows":1}
 */
function handleUpdateContentRequest(req) {
    var errs = [];
    if (!validateReqData(req.data, errs)) return new http.Response(400, errs.join('\n'));
    //
    var ok = commons.db.insert(
        'update contentNodes set `json`=?, `contentTypeName`=? where `name`=?',
        function(stmt) {
        stmt.bindString(0, req.data.json);
        stmt.bindString(1, req.data.contentTypeName);
        stmt.bindString(2, req.data.name);
    });
    //
    return new http.Response(200, JSON.stringify({numAffectedRows: ok}), {
        'Content-Type': 'application/json'
    });
}

/**
 * GET /api/content-type: lists all content types.
 *
 * Example response:
 * [
 *     {"name":"Article","fields":{"title":"text","body":"richtext"}},
 *     {"name":"Generic","fields":{"content":"richtext"}}
 * ]
 */
function handleGetAllContentTypesRequest() {
    return new http.Response(200, JSON.stringify(website.siteConfig.contentTypes), {
        'Content-Type': 'application/json'
    });
}

/**
 * GET /api/content-type/<name>: returns a content type.
 *
 * Example response:
 * {"name":"Article","fields":{"title":"text","body":"richtext"}}
 */
function handleGetContentTypeRequest(req) {
    var contentType = null;
    var lookFor = req.url.split('/').pop();
    var all = website.siteConfig.contentTypes;
    for (var i = 0; i < all.length; ++i) {
        if (all[i].name == lookFor) { contentType = all[i]; break; }
    }
    if (contentType) return new http.Response(200, JSON.stringify(contentType), {
        'Content-Type': 'application/json'
    });
    return new http.Response(400, 'Content type not found');
}

/**
 * @param {Object} data
 * @param {Array} errs (out)
 * @returns {bool} true == ok, false == had errors
 */
function validateReqData(data, errs) {
    if (!data.name) errs.push('name is required.');
    if (!data.json) errs.push('json is required.');
    if (!data.contentTypeName) errs.push('contentTypeName is required.');
    return errs.length == 0;
}