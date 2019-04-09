/**
 * # templating.js
 *
 * In this file:
 *
 * ## DomTree: class
 * ## templateCache: singleton
 * ## transpiler: singleton
 *
 */
const {transpiler} = require('./jsx/transpiler.js');

class ElNode { constructor(tagName, props, children) {
    this.tagName = tagName;
    this.props = props;
    this.children = children;
} }
class TextNode { constructor(chars) {
    this.chars = '' + chars;
} }
class FuncNode { constructor(fn, props) {
    this.fn = fn;
    this.props = props;
    this._cachedFnResult = null;
} }

class DomTree {
    /**
     * @param {string|Function} tagName
     * @param {Object} props
     * @param {any|any[]} children
     */
    createElement(tagName, props, children) {
        if (typeof tagName === 'string') {
            return new ElNode(tagName, props,
                (Array.isArray(children) ? [].concat(...children) : [children]).map(item =>
                    item instanceof ElNode || item instanceof FuncNode
                        ? item
                        : new TextNode(item)
                )
            );
        } else if (typeof tagName === 'function') {
            return new FuncNode(tagName, props);
        } else {
            throw new Error('Unknown tagName or function component: ' + tagName);
        }
    }
    /**
     * @param {ElNode} tree
     * @returns {string}
     * @throws {TypeError} if $tree wasn't valid
     */
    render(tree) {
        throwIfNotElNode(tree);
        const buf = [];
        this._doRender(tree, buf);
        return buf.join('');
    }
    /**
     * @param {ElNode} tree
     * @param {string[]} buf
     */
    _doRender(node, buf) {
        buf.push('<', node.tagName);
        if (node.props) {
            for (const key in node.props) {
                buf.push(' ', key, '="', node.props[key], '"');
            }
        }
        buf.push('>');
        if (transpiler.isVoidElement(node.tagName)) return;
        for (const child of node.children) {
            if (child instanceof ElNode) {
                buf.push(this._doRender(child, buf));
            } else if (child instanceof TextNode) {
                buf.push(child.chars);
            } else if (child instanceof FuncNode) {
                const fnTree = this._lazilyExecFnCmp(child);
                if (fnTree instanceof ElNode) {
                    this._doRender(fnTree, buf);
                } else {
                    buf.push(fnTree);
                }
            }
        }
        buf.push('</', node.tagName, '>');
    }
    /**
     * @param {ElNode} tree
     * @returns {ElNode[]}
     * @throws {TypeError} if $tree wasn't valid
     */
    getRenderedElements(tree) {
        throwIfNotElNode(tree);
        const out = [];
        this._collectElNodes(tree, out);
        return out;
    }
    /**
     * @param {ElNode} tree
     * @returns {FuncNode[]}
     * @throws {TypeError} if $tree wasn't valid
     */
    getRenderedFnComponents(tree) {
        throwIfNotElNode(tree);
        const out = [];
        this._collectFuncNodes(tree, out);
        return out;
    }
    /**
     * @param {ElNode} tree
     * @param {ElNode[]} to
     */
    _collectElNodes(node, to) {
        to.push(node);
        for (const child of node.children) {
            if (child instanceof ElNode) {
                this._collectElNodes(child, to);
            } else if (child instanceof FuncNode) {
                const fnTree = this._lazilyExecFnCmp(child);
                if (fnTree instanceof ElNode) this._collectElNodes(fnTree, to);
            }
        }
    }
    /**
     * @param {ElNode} tree
     * @param {FuncNode[]} to
     */
    _collectFuncNodes(node, to) {
        for (const child of node.children) {
            if (child instanceof ElNode) {
                this._collectFuncNodes(child, to);
            } else if (child instanceof FuncNode) {
                to.push(child);
                const fnTree = this._lazilyExecFnCmp(child);
                if (fnTree instanceof ElNode) this._collectFuncNodes(fnTree, to);
            }
        }
    }
    /**
     * @param {FuncNode} node
     * @returns {any} The return value of node.fn()
     */
    _lazilyExecFnCmp(node) {
        if (node._cachedFnResult === null) {
            node._cachedFnResult = node.fn(node.props || {}, this);
            if (!(node._cachedFnResult instanceof ElNode))
                node._cachedFnResult = node._cachedFnResult.toString();
        }
        return node._cachedFnResult;
    }
}

function throwIfNotElNode(tree) {
    if (!(tree instanceof ElNode)) throw new TypeError('tree is not an ElNode');
}

////////////////////////////////////////////////////////////////////////////////

const templateCache = {
    _fns: {},
    put(fname, fn, doWhine) {
        if (doWhine && this._fns.hasOwnProperty(fname)) {
            throw new Error('Duplicate template "' + fname + '"');
        }
        this._fns[fname] = fn;
        this._fns[fname.split('.')[0]] = this._fns[fname];
    },
    remove(fname) {
        delete this._fns[fname];
        delete this._fns[fname.split('.')[0]];
    },
    get(name) {
        return this._fns[name];
    },
    has(name) {
        return this._fns.hasOwnProperty(name);
    }
};

////////////////////////////////////////////////////////////////////////////////

/**
 * @param {string} src
 * @returns {Function}
 */
transpiler.transpileToFn = src => {
    return new Function('props', 'domTree', transpiler.transpileIsx(src));
};

exports.DomTree = DomTree;
exports.templateCache = templateCache;
exports.transpiler = transpiler;
