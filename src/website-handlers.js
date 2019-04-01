/**
 * # website-handlers.js
 *
 * This file contains handlers for GET|PUT|POST /api/websites/*.
 *
 */
const {webApp, BasicResponse} = require('./web.js');

exports.init = () => {
    webApp.addRoute((url, method) => {
        if (method === 'GET' && url === '/api/websites')
            return (_, then) => {
                then(new BasicResponse(200, '[]', {'Content-Type': 'application/json'}));
            };
    });
};
