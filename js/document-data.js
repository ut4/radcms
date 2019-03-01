// == DocumentDataConfig ====
// =============================================================================
/**
 * @param {Db} db
 * @constructor
 */
exports.DDC = function(db) {
    this.db = db;
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
                                                ++this.batchCount, this));
    return this.batches[len - 1];
};
/**
 * @param {string} contentTypeName
 * @returns {DBC}
 */
exports.DDC.prototype.fetchOne = function(contentTypeName) {
    var len = this.batches.push(new exports.DBC(contentTypeName, false,
                                                ++this.batchCount, this));
    return this.batches[len - 1];
};
/**
 * @param {Object[]} allContentNodes
 */
exports.DDC.prototype.setData = function(allContentNodes) {
    this.data = allContentNodes;
};
/**
* Runs $ddc.toSql() and stores the result to $ddc.data.
*/
function doFetchData(ddc) {
    if (ddc.batchCount) {
        var cnodes = [];
        ddc.db.select(ddc.toSql(), function(row) {
            var data = JSON.parse(row.getString(2));
            data.defaults = {
                id: row.getInt(0),
                name: row.getString(1),
                dataBatchConfigId: row.getInt(3)
            };
            cnodes.push(data);
        });
        ddc.setData(cnodes);
    }
}
/**
 * @param {DBC} dbc
 * @returns {Object[]|Object} The content nodes belonging to $dbc.
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
 * @returns {string}
 * @throws {TypeError}
 */
exports.DDC.prototype.toSql = function() {
    if (!this.batches.length) {
        throw new TypeError('Can\'t generate from empty config.');
    }
    return this.batches.map(function(batch) {
        return 'select * from (' +
            'select `id`,`name`,`json`, ' + batch.id + ' as `dbcId` ' +
            'from contentNodes where ' + batch.toSql() +
        ')';
    }).join(' union all ');
};

// == DataBatchConfig ====
// =============================================================================
/**
 * @param {string} contentTypeName
 * @param {bool} isFetchAll
 * @param {number} id
 * @param {DDC} ddc
 * @constructor
 */
exports.DBC = function(contentTypeName, isFetchAll, id, ddc) {
    this.contentTypeName = contentTypeName;
    this.isFetchAll = isFetchAll;
    this.id = id;
    this.ddc = ddc;
    this.whereExpr = null;
    this.orderByExpr = null;
    this.limitExpr = null;
};
/**
 * @param {string} expr '`someField` = 1'
 * @returns {this}
 */
exports.DBC.prototype.where = function(expr) {
    this.whereExpr = expr;
    return this;
};
/**
 * @param {string} expr '`someField` asc'
 * @returns {this}
 */
exports.DBC.prototype.orderBy = function(expr) {
    this.orderByExpr = expr;
    return this;
};
/**
 * @param {string} expr '1' or '10 offset 80'
 * @returns {this}
 */
exports.DBC.prototype.limit = function(expr) {
    this.limitExpr = expr;
    return this;
};
/**
 * @param {Object} opts {nthPage: 1, limit: 10}. Note: modifies $opts if it has string-values.
 * @returns {this}
 */
exports.DBC.prototype.paginate = function(opts) {
    opts.nthPage = opts.nthPage ? parseInt(opts.nthPage) : 1;
    opts.limit = opts.limit ? parseInt(opts.limit) : 10;
    if (opts.nthPage > 1) {
        this.limit(opts.limit + (' offset ' + ((opts.nthPage - 1) * opts.limit)));
    } else {
        this.limit(opts.limit);
    }
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
    var tail = '';
    if (this.orderByExpr) {
        tail += ' order by ' + this.orderByExpr;
    }
    if (this.limitExpr) {
        tail += ' limit ' + this.limitExpr;
    }
    if (!this.isFetchAll) {
        return this.whereExpr + tail;
    }
    return '`contentTypeName` = \'' + this.contentTypeName + '\'' +
            (!this.whereExpr ? '' : ' and ' + this.whereExpr) + tail;
};
/**
 * @returns {Object|Object[]}
 */
exports.DBC.prototype.exec = function() {
    doFetchData(this.ddc);
    var out = this.ddc.getDataFor(this);
    return out;
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
    }
    return errors.length ? errors.join('\n') : null;
}