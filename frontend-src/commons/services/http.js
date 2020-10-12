import myFetch from './myFetch.js';
import config from '../config.js';

const defaultHeaders = {'Content-Type': 'application/json'};

const http = {
    /**
     * @param {string} url
     * @returns Promise<Object>
     */
    get(url) {
        return myFetch(url)
            .then(res => JSON.parse(res.responseText));
    },
    /**
     * @param {string} url
     * @param {Object|string} data
     * @returns Promise<Object>
     */
    post(url, data, method = 'POST') {
        return myFetch(url, {
                method,
                headers: defaultHeaders,
                data: typeof data !== 'string'
                    ? JSON.stringify(Object.assign({csrfToken: config.csrfToken}, data)) : data
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
    },
    /**
     * @param {string} url
     * @returns Promise<Object>
     */
    delete(url) {
        return myFetch(url, {method: 'DELETE', headers: defaultHeaders})
            .then(res => JSON.parse(res.responseText));
    }
};

export default http;
