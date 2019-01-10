// == DocumentDataConfig ====
// =============================================================================
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
    if (dbc.isFetchAll) return this.data.filter(function(component) {
        return component.dataBatchConfigId == dbc.id;
    });
    var l = this.data.length;
    for (var i = 0; i < l; ++i) {
        if (this.data[i].dataBatchConfigId == dbc.id) return this.data[i];
    }
    return {};
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
exports.DDC.prototype.toSql = function() {
    if (!this.batches.length) {
        throw new TypeError('Can\'t generate from empty config.');
    }
    return 'select `id`,`name`,`json`,`dbcId` from (' +
        this.batches.map(function(batch) {
            return 'select * from (' +
                'select `id`,`name`,`json`, ' + batch.id + ' as `dbcId` ' +
                'from components where ' + batch.toSql() +
            ')';
        }).join(' union all ') +
    ')';
};

// == DataBatchConfig ====
// =============================================================================
/**
 * @param {string} componentTypeName
 * @param {bool} isFetchAll
 * @param {number} id
 */
exports.DBC = function(componentTypeName, isFetchAll, id) {
    this.componentTypeName = componentTypeName;
    this.isFetchAll = isFetchAll;
    this.id = id;
    this.whereExpr = null;
};
/**
 * @param {string} whereExpr
 */
exports.DBC.prototype.where = function(whereExpr) {
    this.whereExpr = whereExpr;
    return this;
};
/**
 * @returns {string}
 */
exports.DBC.prototype.toSql = function() {
    if (this.whereExpr && !this.isFetchAll) {
        return this.whereExpr;
    } else if (this.isFetchAll) {
        return '`componentTypeId` = (select `id` from componentTypes where `name` = \''+
            this.componentTypeName + '\')';
    }
    throw new Error("Not implemented yet.");
};