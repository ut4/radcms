var services = require('services');
var app = services.app;

app.addRoute(function(method, url) {
    if (method == 'GET' && url == '/api/website/pages') return handleGetPagesRequest;
    return null;
});

function handleGetPagesRequest() {
    return new Response(200, JSON.stringify(services.website.getPages()), {
        'Content-Type': 'application/json'
    });
}