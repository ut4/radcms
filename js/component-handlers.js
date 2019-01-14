var commons = require('common-services.js');
var http = require('http.js');

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
 *     {"id":2,"name":"Article","props":[
 *          {"id":1,"name":"title","contentType":"text","componentTypeId":2},
 *          {"id":1,"name":"body","contentType":"richtext","componentTypeId":2},
 *     ]}
 * ]
 */
function handleGetComponentTypesRequest() {
    var p = {};
    var out = [];
    commons.db.select(
        'select ct.id, ct.`name`, ctp.id, ctp.`key`, ctp.contentType ' +
        'from componentTypes ct ' +
        'join componentTypeProps ctp on (ctp.componentTypeId = ct.id)', function(row) {
        var typeId = row.getInt(0);
        var idx = !p.hasOwnProperty(typeId) ? -1 : p[typeId];
        if (idx < 0) {
            idx = out.length;
            p[typeId] = out.length;
            out.push({id: typeId, name: row.getString(1), props: []});
        }
        out[idx].props.push({
            id: row.getInt(2),
            name: row.getString(3),
            contentType: row.getString(4),
            componentTypeId: typeId
        });
    });
    //
    return new http.Response(200, JSON.stringify(out), {
        'Content-Type': 'application/json'
    });
}

/**
 * POST /api/component: inserts a new component to the database.
 *
 * Payload:
 * name=str|required&
 * json=str|required&
 * componentTypeId=uint|required
 *
 * Example response:
 * {"insertId":1}
 */
function handleCreateComponentRequest(req) {
    var errs = [];
    if (!req.data.name) errs.push('Name is required.');
    if (!req.data.json) errs.push('Json is required.');
    if (!req.data.componentTypeId) errs.push('Component type id is required.');
    if (errs.length) return new http.Response(400, errs.join('\n'));
    //
    var insertId = commons.db.insert(
        'insert into components (`name`, `json`, `componentTypeId`) values (?, ?, ?)',
        function(stmt) {
        stmt.bindString(0, req.data.name);
        stmt.bindString(1, req.data.json);
        stmt.bindInt(2, parseInt(req.data.componentTypeId));
    });
    //
    return new http.Response(200, '{"insertId":'+insertId+'}', {
        'Content-Type': 'application/json'
    });
}