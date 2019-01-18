var commons = require('common-services.js');
var http = require('http.js');
var website = require('website.js');

commons.app.addRoute(function(url, method) {
    if (method == 'GET' && url == '/api/component-type')
        return handleGetComponentTypesRequest;
    if (method == 'POST' && url == '/api/component')
        return handleCreateComponentRequest;
});

/**
 * GET /api/component-type: lists all component types.
 *
 * Example response:
 * [
 *     {"id":2,"name":"Article","props":{"title":"text","body":"richtext"}}
 * ]
 */
function handleGetComponentTypesRequest() {
    return new http.Response(200, JSON.stringify(website.siteConfig.componentTypes), {
        'Content-Type': 'application/json'
    });
}

/**
 * POST /api/component: inserts a new component to the database.
 *
 * Payload:
 * name=str|required&
 * json=str|required&
 * componentTypeName=string|required
 *
 * Example response:
 * {"insertId":1}
 */
function handleCreateComponentRequest(req) {
    var errs = [];
    if (!req.data.name) errs.push('Name is required.');
    if (!req.data.json) errs.push('Json is required.');
    if (!req.data.componentTypeName) errs.push('ComponentTypeName is required.');
    if (errs.length) return new http.Response(400, errs.join('\n'));
    //
    var insertId = commons.db.insert(
        'insert into components (`name`, `json`, `componentTypeName`) values (?, ?, ?)',
        function(stmt) {
        stmt.bindString(0, req.data.name);
        stmt.bindString(1, req.data.json);
        stmt.bindString(2, req.data.componentTypeName);
    });
    //
    return new http.Response(200, '{"insertId":'+insertId+'}', {
        'Content-Type': 'application/json'
    });
}