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

export {dateUtils};
