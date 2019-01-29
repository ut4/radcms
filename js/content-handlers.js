var commons = require('common-services.js');
var http = require('http.js');
var website = require('website.js');

commons.app.addRoute(function(url, method) {
    if (method == 'GET' && url == '/api/content-type')
        return handleGetContentTypesRequest;
    if (method == 'POST' && url == '/api/content')
        return handleCreateContentRequest;
});

/**
 * GET /api/content-type: lists all content types.
 *
 * Example response:
 * [
 *     {"id":2,"name":"Article","fields":{"title":"text","body":"richtext"}}
 * ]
 */
function handleGetContentTypesRequest() {
    return new http.Response(200, JSON.stringify(website.siteConfig.contentTypes), {
        'Content-Type': 'application/json'
    });
}

/**
 * POST /api/content: inserts a new content node to the database.
 *
 * Payload:
 * name=str|required&
 * json=str|required&
 * contentTypeName=string|required
 *
 * Example response:
 * {"insertId":1}
 */
function handleCreateContentRequest(req) {
    var errs = [];
    if (!req.data.name) errs.push('name is required.');
    if (!req.data.json) errs.push('json is required.');
    if (!req.data.contentTypeName) errs.push('contentTypeName is required.');
    if (errs.length) return new http.Response(400, errs.join('\n'));
    //
    var insertId = commons.db.insert(
        'insert into contentNodes (`name`, `json`, `contentTypeName`) values (?, ?, ?)',
        function(stmt) {
        stmt.bindString(0, req.data.name);
        stmt.bindString(1, req.data.json);
        stmt.bindString(2, req.data.contentTypeName);
    });
    //
    return new http.Response(200, '{"insertId":'+insertId+'}', {
        'Content-Type': 'application/json'
    });
}