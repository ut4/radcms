/**
 * # content-handlers.js
 *
 * This file contains http-handlers for * /api/content/* and * /api/content-types/*.
 *
 */
const {webApp} = require('./web.js');
const {app} = require('./app.js');
const {rejectRequest} = require('./website-handlers.js');

exports.init = () => {
    webApp.addRoute((url, method) => {
        let match = null;
        if (method === 'GET') {
            if (url === '/api/content-types')
                match = handleGetAllContentTypesRequest;
            else if (url.indexOf('/api/content-types/') > -1)
                match = handleGetContentTypeRequest;
            else if (url.indexOf('/api/content/') > -1)
                match = handleGetContentNodeRequest;
            else
                return;
        } else if (method === 'POST' && url === '/api/content')
            match = handleCreateContentRequest;
        else if (method === 'PUT' && url === '/api/content')
            match = handleUpdateContentRequest;
        else
            return;
        return app.currentWebsite ? match : rejectRequest;
    });
};

/**
 * GET /api/content-types: lists all content types.
 *
 * Example response:
 * [
 *     {"name":"Article","fields":{"title":"text","body":"richtext"}},
 *     {"name":"Generic","fields":{"content":"richtext"}}
 * ]
 */
function handleGetAllContentTypesRequest(_, res) {
    return res.json(200, app.currentWebsite.db
        .prepare('select `id`,`name`,`fields` from contentTypes')
        .all()
        .map(row => {
            row.fields = JSON.parse(row.fields);
            return row;
        }));
}

/**
 * GET /api/content-types/<id>: returns a content type.
 *
 * Example response:
 * {"name":"Article","fields":{"title":"text","body":"richtext"}}
 */
function handleGetContentTypeRequest(req, res) {
    const id = parseInt(req.path.split('/').pop());
    const type = app.currentWebsite.db
        .prepare('select `id`,`name`,`fields` from contentTypes where `id` = ?')
        .get(id);
    if (type) { type.fields = JSON.parse(type.fields); res.json(200, type); }
    else res.plain(400, 'Content type not found');
}

/**
 * GET /api/content/<id>: returns a content node.
 *
 * Example response:
 * {
 *     "id": 25,
 *     "name": "foo",
 *     "json": "{"title":"Hello","body":"Foo bar.."}",
 *     "contentTypeId": 1,
 * }
 */
function handleGetContentNodeRequest(req, res) {
    const node = app.currentWebsite.db
        .prepare('select `id`,`name`,`json`,`contentTypeId` from contentNodes where `id` = ?')
        .get(parseInt(req.path.split('/').pop()));
    if (node) res.json(200, node);
    else res.plain(400, 'Content node not found');
}

/**
 * POST /api/content: inserts a new content node to the database.
 *
 * Payload:
 * {
 *     name: string;          // required
 *     json: string;          // required
 *     contentTypeId: number; // required
 * }
 *
 * Example response:
 * {"insertId":1}
 */
function handleCreateContentRequest(req, res) {
    const errs = [];
    if (!validateReqData(req.data, errs)) { res.plain(400, errs.join('\n')); return; }
    //
    const insertId = app.currentWebsite.db
        .prepare('insert into contentNodes (`name`, `json`, `contentTypeId`) values (?, ?, ?)')
        .run(req.data.name, req.data.json, req.data.contentTypeId)
        .lastInsertRowid;
    //
    return res.json(200, {insertId: insertId});
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
function handleUpdateContentRequest(req, res) {
    const errs = [];
    if (!validateReqData(req.data, errs)) { res.plain(400, errs.join('\n')); return; }
    //
    const numChanges = app.currentWebsite.db
        .prepare('update contentNodes set `json`=?, `contentTypeId`=? where `name`=?')
        .run(req.data.json, req.data.contentTypeId, req.data.name)
        .changes;
    //
    res.json(200, {numAffectedRows: numChanges});
}

/**
 * @param {Object} data
 * @param {Array} errs (out)
 * @returns {bool} true == ok, false == had errors
 */
function validateReqData(data, errs) {
    if (!data.name) errs.push('name is required.');
    if (!data.json) errs.push('json is required.');
    if (!data.contentTypeId) errs.push('contentTypeId is required.');
    else if (parseInt(data.contentTypeId) != data.contentTypeId)
        errs.push('contentTypeId must be an integer');
    return errs.length == 0;
}
