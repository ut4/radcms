class FieldsFilter {
    /**
     * @param {Array<string} fieldsToDisplay
     */
    constructor(fieldsToDisplay) {
        this.fieldsToDisplay = fieldsToDisplay || [];
    }
    /**
     * @param {Array<{name: string; [key: any]: any;}>} fields
     * @returns {Array<{name: string; [key: any]: any;}>}
     * @access public
     */
    doFilter(fields) {
        // validate
        this.fieldsToDisplay.forEach(name => {
            if (!fields.some(f => f.name === name))
                console.warn(`No field named "${name}".`);
        });
        // filter
        return fields.filter(this.fieldShouldBeShown.bind(this));
    }
    /**
     * @param {{name: string; [key: any]: any;}} field
     * @returns {boolean}
     * @access public
     */
    fieldShouldBeShown(field) {
        return !this.fieldsToDisplay.length || this.fieldsToDisplay.indexOf(field.name) > -1;
    }
    /**
     * @returns {Array<string>}
     * @access public
     */
    getFieldsToDisplay() {
        return this.fieldsToDisplay;
    }
}

export default FieldsFilter;
