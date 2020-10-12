import {urlUtils} from '../utils.js';

function myFetch(url, options = {}) {
    const req = new XMLHttpRequest();
    return new Promise(resolve => {
        req.onreadystatechange = () => {
            if (req.readyState === 4)
                resolve(req);
        };
        if (options.progress) {
            req.onprogress = e => {
                options.progress(e.target, e.lengthComputable ? e.loaded / e.total * 100 : -1);
            };
        }
        req.responseType = options.responseType || '';
        req.open(options.method || 'GET', urlUtils.makeUrl(url), true);
        const headers = Object.assign({}, options.headers, {
            'X-Requested-With': 'Loving kindness'
        });
        Object.keys(headers).forEach(key => {
            req.setRequestHeader(key, headers[key]);
        });
        req.send(options.data);
    });
}

export default myFetch;
