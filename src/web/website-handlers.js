var services = require('services');
var db = services.db;
var app = services.app;

const UPLOAD_STATUS_UPLOADED = 2;

app.addRoute(function(method, url) {
    if (method == 'GET' && url == '/api/website/pages')
        return handleGetPagesRequest;
    if (method == 'GET' && url == '/api/website/num-pending-changes')
        return handleGetNumPendingChangesRequest;
    return null;
});

function handleGetPagesRequest() {
    var statuses = {};
    db.selectAll('select `url`, `status` from uploadStatuses', function(row) {
        statuses[row.getString(0)] = row.getInt(1);
    });
    //
    return new Response(200,
        JSON.stringify(services.website.getPages().map(function(page) {
            page.uploadStatus = statuses[page.url] || 0;
            return page;
        })),
        {'Content-Type': 'application/json'}
    );
}

function handleGetNumPendingChangesRequest() {
    var count = 0;
    db.selectAll('select count(`url`) from uploadStatuses where `status` = ' +
        UPLOAD_STATUS_UPLOADED, function(row) {
        count = row.getInt(0);
    });
    //
    return new Response(200, services.website.getPageCount() - count,
        {'Content-Type': 'application/json'});
}