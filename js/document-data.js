// == DataBatchConfig ====
// =============================================================================
/**
 * @param {string} componentTypeName
 * @param {bool} isFetchAll
 * @param {number} id
 */
exports.DBC = function(componentTypeName, isFetchAll, id) {
    this.componentTypeNameName = componentTypeName;
    this.isFetchAll = isFetchAll;
    this.id = id;
};
/**
 * @param {string} where
 */
exports.DBC.prototype.where = function(where) {
    this.where = where;
    return this;
};

// == DocumentDataConfig ====
// =============================================================================
/** */
exports.DDC = function() {
    this.batches = [];
    this.batchCount = 0;
    this.data = [];
};
/**
 * @param {string} componentTypeName
 * @returns {DBC}
 */
exports.DDC.prototype.fetchAll = function(componentTypeName) {
    var len = this.batches.push(new exports.DBC(componentTypeName, true,
                                                ++this.batchCount));
    return this.batches[len - 1];
};
/**
 * @param {string} componentTypeName
 * @returns {DBC}
 */
exports.DDC.prototype.fetchOne = function(componentTypeName) {
    var len = this.batches.push(new exports.DBC(componentTypeName, false,
                                                ++this.batchCount));
    return this.batches[len - 1];
};
/**
 * @param {DBC} dbc
 * @param {Component[]}
 */
exports.DDC.prototype.getDataFor = function(dbc) {
    return this.data.filter(function(component) {
        return component.dbcId == dbc.id;
    });
};
/**
 * @param {Component[]} allComponents
 */
exports.DDC.prototype.setComponents = function(allComponents) {
    this.data = allComponents;
};
/**
 * @returns {string}
 * @throws {TypeError}
 */
exports.DBC.prototype.toSql = function() {
    if (!this.batches.length) {
        throw new TypeError('Can\'t generate from empty config.');
    }
    var out = 'select `id`,`name`,`json`,`dbcId` from (';
    this.batches.forEach(function(batch, i) {
        if (i > 0) out += ' union all ';
        out += 'select * from (' +
            'select `id`,`name`,`json`, ' + batch.id + ' as `dbcId` ' +
            'from components where ' + batch.where +
        ')';
    });
    out += ')';
    return out;
};