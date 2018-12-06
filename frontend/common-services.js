function myFetch(url, options = {method: 'GET', headers: {}}) {
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
        req.open(options.method, url, true);
        Object.keys(options.headers).forEach(key => {
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
