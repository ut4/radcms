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
        return component.cmp.dataBatchConfigId == dbc.id;
    });
    var l = this.data.length;
    for (var i = 0; i < l; ++i) {
        if (this.data[i].cmp.dataBatchConfigId == dbc.id) return this.data[i];
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
    var errors;
    if ((errors = dbcValidate(this))) {
        throw new TypeError(errors);
    }
    if (!this.isFetchAll) {
        return this.whereExpr;
    }
    return '`componentTypeId` = (select `id` from componentTypes where `name` = \''+
        this.componentTypeName + '\')';
};
/**
 * @returns {string|null}
 */
function dbcValidate(dbc) {
    var errors = [];
    var MAX_CMP_TYPE_NAME_LEN = 64;
    var MAX_WHERE_LEN = 2048;
    if (!dbc.componentTypeName) {
        throw new TypeError('Component type name is required');
    } else if (dbc.componentTypeName.length > MAX_CMP_TYPE_NAME_LEN) {
        errors.push('Component type name too long (max ' +
        MAX_CMP_TYPE_NAME_LEN + ', was ' + dbc.componentTypeName.length + ').');
    }
    if (!dbc.isFetchAll) {
        if (!dbc.whereExpr) {
            errors.push('fetchOne(...).where() is required.');
        } else if (dbc.whereExpr.length > MAX_WHERE_LEN) {
            errors.push('fetchOne(...).where() too long (max ' +
            MAX_WHERE_LEN + ', was ' + dbc.whereExpr.length + ').');
        }
    } else {
        if (dbc.whereExpr) {
            errors.push('fetchAll().where() not implemented yet.');
        }
    }
    return errors.length ? errors.join('\n') : null;
}