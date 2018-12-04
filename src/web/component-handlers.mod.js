var services = require('services');
var app = services.app;
var db = services.db;

app.addRoute(function(method, url) {
    if (method == 'GET' && url == '/api/component-type') return listComponentTypes;
    return null;
});

function listComponentTypes() {
    var types = [];
    db.selectAll('select id, `name` from componentTypes', function(row) {
        types.push({
            id: row.getInt(0),
            name: row.getString(1),
        });
    });
    return new Response(200, JSON.stringify(types));
}