import config from './config.js';

const dateUtils = {
    /**
     * @param {Date} date
     * @param {boolean} includeTime = false
     * @returns {string}
     */
    getLocaleDateString(date, includeTime = false) {
        return date.getDate() + '.' + (date.getMonth() + 1) + ' ' + date.getFullYear() +
               (!includeTime ? '' : ', ' + this.getLocaleTimeString(date));
    },
    /**
     * @param {Date} date
     * @returns {string}
     */
    getLocaleTimeString(date) {
        const zeroPrefix = num => num > 9 ? num.toString() : '0' + num;
        return zeroPrefix(date.getHours()) + ':' +
               zeroPrefix(date.getMinutes());
    }
};

const urlUtils = {
    /**
     * @param {string} to
     * @param {string?} type "hard"
     */
    redirect(to, type) {
        if (type !== 'hard') {
            window.location.hash = `#/${this.normalizeUrl(to)}`;
        } else {
            window.location.href = window.location.origin + config.baseUrl +
                                   'edit' +
                                   (to !== '/' ? `/${this.normalizeUrl(to)}` : '');
        }
    },
    /**
     * ...
     */
    reload() {
        window.location.reload();
    },
    /**
     * @param {string} url
     */
    makeUrl(url) {
        return config.baseUrl + this.normalizeUrl(url);
    },
    /**
     * @param {string} url
     */
    makeAssetUrl(url) {
        return config.assetBaseUrl + this.normalizeUrl(url);
    },
    /**
     * @param {string} url '/foo' -> 'foo', 'bar' -> 'bar'
     */
    normalizeUrl(url) {
        return url[0] !== '/' ? url : url.substr(1);
    }
};

export {dateUtils, urlUtils};
