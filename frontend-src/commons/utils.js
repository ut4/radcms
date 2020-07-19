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
    baseUrl: '',
    assetBaseUrl: '',
    currentPagePath: '',
    /**
     * @param {string} to
     * @param {string?} type "hard"
     */
    redirect(to, type) {
        if (type !== 'hard') {
            window.location.hash = `#/${this.normalizeUrl(to)}`;
        } else {
            if (to === '@current')
                to = this.currentPagePath;
            window.location.href = window.location.origin + this.baseUrl +
                                   '_edit' +
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
     * @returns {string}
     */
    makeUrl(url) {
        return this.baseUrl + this.normalizeUrl(url);
    },
    /**
     * @param {string} url
     * @returns {string}
     */
    makeAssetUrl(url) {
        return this.assetBaseUrl + this.normalizeUrl(url);
    },
    /**
     * @param {string} url '/foo' -> 'foo', 'bar' -> 'bar'
     * @returns {string}
     */
    normalizeUrl(url) {
        return url[0] !== '/' ? url : url.substr(1);
    }
};

export {dateUtils, urlUtils};
