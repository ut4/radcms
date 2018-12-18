var services = require('services');
var app = services.app;
var db = services.db;

app.addRoute(function(method, url) {
    if (method == 'GET' && url == '/api/component-type') return listComponentTypes;
    return null;
});

function listComponentTypes() {
    var types = {};
    var props = [];
    db.selectAll(
        'select ct.id, ct.`name`, ctp.id, ctp.`key`, ctp.contentType ' +
        'from componentTypes ct ' +
        'join componentTypeProps ctp on (ctp.componentTypeId = ct.id)', function(row) {
        var typeId = row.getInt(0);
        types[typeId] = {
            id: typeId,
            name: row.getString(1),
            props: []
        };
        props.push({
            id: row.getInt(2),
            name: row.getString(3),
            contentType: row.getString(4),
            cmpTypeId: typeId
        });
    });
    //
    props.forEach(function(prop) {
        types[prop.cmpTypeId].props.push(prop);
    });
    var out = [];
    for (var key in types) out.push(types[key]);
    return new Response(200, JSON.stringify(out), {
        'Content-Type': 'application/json'
    });
}