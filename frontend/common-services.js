function myFetch(url, options = {}) {
    const req = new XMLHttpRequest();
    return new Promise((resolve, reject) => {
        req.onreadystatechange = () => {
            if (req.readyState !== 4) return;
            if (req.status >= 200 && req.status < 300) {
                resolve(req);
            } else {
                reject(req);
            }
        };
        if (options.progress) {
            req.onprogress = e => {
                options.progress(e.target, e.lengthComputable ? e.loaded / e.total * 100 : -1);
            };
        }
        req.open(options.method || 'GET', url, true);
        Object.keys(options.headers || {}).forEach(key => {
            req.setRequestHeader(key, options.headers[key]);
        });
        req.send(options.data);
    }).catch(err => {
        console.error(err);
    });
}

/** Mockable, application-wide container */
const services = {
    myFetch
};

export default services;