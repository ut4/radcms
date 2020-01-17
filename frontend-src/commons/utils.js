import config from './config.js';

const dateUtils = {
    /**
     * @param {Date} date
     * @param {boolean} includeTime = false
     * @return {string}
     */
    getLocaleDateString(date, includeTime = false) {
        return date.getDate() + '.' + (date.getMonth() + 1) + ' ' + date.getFullYear() +
               (!includeTime ? '' : ', ' + this.getLocaleTimeString(date));
    },
    /**
     * @param {Date} date
     * @return {string}
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
     * @param {boolean?} full
     */
    redirect(to, full) {
        if (!full) {
            window.location.hash = '#' + to;
        } else {
            window.location.href = window.location.origin + config.baseUrl + 'edit' + (to.length > 1 ? to : to.substr(1));
        }
    },
    /**
     * @param {string} url
     */
    makeUrl(url) {
        return config.baseUrl + url.substr(1);
    }
};

export {dateUtils, urlUtils};
