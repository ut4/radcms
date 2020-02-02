import myFetch from './myFetch.js';

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

export default http;
