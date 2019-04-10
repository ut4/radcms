/**
 * # document-data.js
 *
 * In this file:
 *
 * ## DDC (DocumentDataConfig): class
 * ## DBC (DataBatchConfig): class
 *
 */

// {'ownfield': value, 'extrafield__separator__datatype': value}
const EXTRA_FIELD_SEPARATOR = '__separator__';

class DDC {
    /**
     * @param {Db} db
     */
    constructor(db) {
        this.db = db;
        this.batches = [];
        this.batchCount = 0;
        this.data = [];
    }
    /**
     * @param {string} contentTypeName eg. 'Article', 'Product', 'Movie', 'Employee'
     * @returns {DBC}
     */
    fetchAll(contentTypeName) {
        const len = this.batches.push(new exports.DBC(contentTypeName, true,
                                                      ++this.batchCount, this));
        return this.batches[len - 1];
    }
    /**
     * @param {string} contentTypeName
     * @returns {DBC}
     */
    fetchOne(contentTypeName) {
        const len = this.batches.push(new exports.DBC(contentTypeName, false,
                                                      ++this.batchCount, this));
        return this.batches[len - 1];
    }
    /**
     * @param {Object[]} allContentNodes
     */
    setData(allContentNodes) {
        this.data = allContentNodes;
    }
    /**
     * @param {DBC} dbc
     * @returns {Object[]|Object} The content nodes belonging to $dbc.
     */
    getDataFor(dbc) {
        if (dbc.isFetchAll) return this.data.filter(c =>
            c.defaults.dataBatchConfigId === dbc.id
        );
        const l = this.data.length;
        for (let i = 0; i < l; ++i) {
            if (this.data[i].defaults.dataBatchConfigId === dbc.id) return this.data[i];
        }
        return {};
    }
    /**
     * @returns {string}
     * @throws {TypeError}
     */
    toSql() {
        if (!this.batches.length) {
            throw new TypeError('Can\'t generate from empty config.');
        }
        return this.batches.map(batch =>
            'select * from (' +
                'select `id`,`name`,`json`, ' + batch.id + ' as `dbcId` ' +
                'from contentNodes where ' + batch.toSql() +
            ')'
        ).join(' union all ');
    }
}
/**
* Runs $ddc.toSql() and stores the result to $ddc.data.
*/
function ddcFetchData(ddc) {
    if (ddc.batchCount) {
        const cnodes = [];
        ddc.db.prepare(ddc.toSql()).raw().all().forEach(row => {
            const data = JSON.parse(row[2]);
            // {'fieldname__separator__datatype': 'foo'} -> {..., 'fieldname': 'foo'}
            for (const key in data) {
                if (key.indexOf(EXTRA_FIELD_SEPARATOR) > 0) {
                    data[key.split(EXTRA_FIELD_SEPARATOR)[0]] = data[key];
                }
            }
            data.defaults = {
                id: row[0],
                name: row[1],
                dataBatchConfigId: row[3]
            };
            cnodes.push(data);
        });
        ddc.setData(cnodes);
    }
}

////////////////////////////////////////////////////////////////////////////////

class DBC {
    /**
     * @param {string} contentTypeName
     * @param {bool} isFetchAll
     * @param {number} id
     * @param {DDC} ddc
     * @constructor
     */
    constructor(contentTypeName, isFetchAll, id, ddc) {
        this.contentTypeName = contentTypeName;
        this.isFetchAll = isFetchAll;
        this.id = id;
        this.ddc = ddc;
        this.whereExpr = null;
        this.orderByExpr = null;
        this.limitExpr = null;
    }
    /**
     * @param {string} expr '`someField` = 1'
     * @returns {this}
     */
    where(expr) {
        this.whereExpr = expr;
        return this;
    }
    /**
     * @param {string} expr '`someField` asc'
     * @returns {this}
     */
    orderBy(expr) {
        this.orderByExpr = expr;
        return this;
    }
    /**
     * @param {string} expr '1' or '10 offset 80'
     * @returns {this}
     */
    limit(expr) {
        this.limitExpr = expr;
        return this;
    }
    /**
     * @param {Object} opts {nthPage: 1, limit: 10}. Note: modifies $opts if it has string-values.
     * @returns {this}
     */
    paginate(opts) {
        opts.nthPage = opts.nthPage ? parseInt(opts.nthPage) : 1;
        opts.limit = opts.limit ? parseInt(opts.limit) : 10;
        if (opts.nthPage > 1) {
            this.limit(opts.limit + (' offset ' + ((opts.nthPage - 1) * opts.limit)));
        } else {
            this.limit(opts.limit);
        }
        return this;
    }
    /**
     * @returns {string}
     */
    toSql() {
        let errors;
        if ((errors = dbcValidate(this))) {
            throw new TypeError(errors);
        }
        let tail = '';
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
    }
    /**
     * @returns {Object|Object[]|Array<Object|Object[]>}
     */
    exec() {
        ddcFetchData(this.ddc);
        return this.ddc.batchCount == 1
            ? this.ddc.getDataFor(this)
            : this.ddc.batches.map(dbc => this.ddc.getDataFor(dbc));
    }
    /**
     * @see DDC.fetchOne
     */
    fetchOne(contentTypeName) {
        return this.ddc.fetchOne(contentTypeName);
    }
    /**
     * @see DDC.fetchAll
     */
    fetchAll(contentTypeName) {
        return this.ddc.fetchAll(contentTypeName);
    }
}
/**
 * @returns {string|null}
 */
function dbcValidate(dbc) {
    const errors = [];
    const MAX_CNT_TYPE_NAME_LEN = 64;
    const MAX_WHERE_LEN = 2048;
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

exports.DDC = DDC;
exports.DBC = DBC;
