// == DocumentDataConfig ====
// =============================================================================
exports.DDC = function() {
    this.batches = [];
    this.batchCount = 0;
    this.data = [];
};
/**
 * @param {string} contentTypeName eg. 'Article', 'Product', 'Movie', 'Employee'
 * @returns {DBC}
 */
exports.DDC.prototype.fetchAll = function(contentTypeName) {
    var len = this.batches.push(new exports.DBC(contentTypeName, true,
                                                ++this.batchCount));
    return this.batches[len - 1];
};
/**
 * @param {string} contentTypeName
 * @returns {DBC}
 */
exports.DDC.prototype.fetchOne = function(contentTypeName) {
    var len = this.batches.push(new exports.DBC(contentTypeName, false,
                                                ++this.batchCount));
    return this.batches[len - 1];
};
/**
 * @param {DBC} dbc
 * @returns {Object[]|Object} The content nodes
 */
exports.DDC.prototype.getDataFor = function(dbc) {
    if (dbc.isFetchAll) return this.data.filter(function(c) {
        return c.defaults.dataBatchConfigId == dbc.id;
    });
    var l = this.data.length;
    for (var i = 0; i < l; ++i) {
        if (this.data[i].defaults.dataBatchConfigId == dbc.id) return this.data[i];
    }
    return {};
};
/**
 * @param {Object[]} allContentNodes
 */
exports.DDC.prototype.setContentNodes = function(allContentNodes) {
    this.data = allContentNodes;
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
                'from contentNodes where ' + batch.toSql() +
            ')';
        }).join(' union all ') +
    ')';
};

// == DataBatchConfig ====
// =============================================================================
/**
 * @param {string} contentTypeName
 * @param {bool} isFetchAll
 * @param {number} id
 */
exports.DBC = function(contentTypeName, isFetchAll, id) {
    this.contentTypeName = contentTypeName;
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
    return '`contentTypeName` = \'' + this.contentTypeName + '\'';
};
/**
 * @returns {string|null}
 */
function dbcValidate(dbc) {
    var errors = [];
    var MAX_CNT_TYPE_NAME_LEN = 64;
    var MAX_WHERE_LEN = 2048;
    if (!dbc.contentTypeName) {
        throw new TypeError('contentTypeName is required');
    } else if (dbc.contentTypeName.length > MAX_CNT_TYPE_NAME_LEN) {
        errors.push('contentTypeName too long (max ' +
        MAX_CNT_TYPE_NAME_LEN + ', was ' + dbc.contentTypeName.length + ').');
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