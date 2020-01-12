const config = {
    baseUrl: '',
    assetBaseUrl: '',
};

function redirect(to, full) {
    if (!full) {
        window.location.hash = '#' + to;
    } else {
        window.location.href = window.location.origin + config.baseUrl + 'edit' + (to.length > 1 ? to : to.substr(1));
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
                const e = new Error();
                e.request = req;
                reject(e);
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
    });
}
myFetch.makeUrl = url => config.baseUrl + url.substr(1);

const http = {
    /**
     * @param {string} url
     * @returns Promise<Object>
     */
    get(url) {
        return services
            .myFetch(url)
            .then(res => JSON.parse(res.responseText));
    },
    /**
     * @param {string} url
     * @param {Object|string} data
     * @returns Promise<Object>
     */
    post(url, data, method = 'POST') {
        return services
            .myFetch(url, {
                method,
                headers: {'Content-Type': 'application/json'},
                data: typeof data !== 'string' ? JSON.stringify(data) : data
            })
            .then(res => JSON.parse(res.responseText));
    },
    /**
     * @param {string} url
     * @param {Object|string} data
     * @returns Promise<Object>
     */
    put(url, data) {
        return this.post(url, data, 'PUT');
    }
};

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
            if (listener.listeningTo === whichSignal &&
                listener.fn(arg) === false) break;
        }
    }
};

/** Mockable, application-wide container */
const services = {
    redirect,
    myFetch,
    http,
    signals,
    config,
};

export default services;
