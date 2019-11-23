const config = {
    baseUrl: '',
    assetBaseUrl: '',
};

function redirect(to, full) {
    if (!full) {
        window.parent.location.hash = '#' + to;
    } else {
        window.parent.location.href = window.parent.location.origin + config.baseUrl + to.substr(1);
    }
}

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
        req.open(options.method || 'GET', myFetch.makeUrl(url), true);
        Object.keys(options.headers || {}).forEach(key => {
            req.setRequestHeader(key, options.headers[key]);
        });
        req.send(options.data);
    }).catch(err => {
        console.error(err);
        throw err;
    });
}
myFetch.makeUrl = url => config.baseUrl + url.substr(1);

const signals = {
    _listeners: [],
    /**
     * @param {string} whichSignal
     * @param {function} fn
     */
    listen: function(whichSignal, fn) {
        this._listeners.push({listeningTo: whichSignal, fn: fn});
    },
    /**
     * @param {string} whichSignal
     * @param {any?} arg
     */
    emit: function(whichSignal, arg) {
        const l = this._listeners.length;
        for (let i = 0; i < l; ++i) {
            const listener = this._listeners[i];
            if (listener.listeningTo == whichSignal &&
                listener.fn(arg) === false) break;
        }
    }
};

/** Mockable, application-wide container */
const services = {
    redirect,
    myFetch,
    signals,
    config,
};

export default services;
