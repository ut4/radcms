function myFetch(url, options, onSuccess, onFail) {
    let req = new XMLHttpRequest();
    req.onreadystatechange = function() {
        if (req.readyState !== 4) return;
        if (req.status >= 200 && req.status < 300) {
            onSuccess(req);
        } else {
            onFail(req);
        }
    };
    req.open(options.method || 'GET', url, true);
    Object.keys(options.headers || {}).forEach(key => {
        req.setRequestHeader(key, options.headers[key]);
    });
    req.send(options.data);
}

export {myFetch};
