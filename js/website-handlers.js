var commons = require('common-services.js');
var http = require('http.js');

commons.app.addRoute(function(url, method) {
    return handleRequest;
});

function handleRequest() {
    return new http.Response(200, 'Hello', {"Content-Type": "text/html"});
}