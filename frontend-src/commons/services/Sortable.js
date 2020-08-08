let counter = 0;

/**
 * Käyttö:
 * ```
 * class MyComponent extends preact.Component {
 *     constructor(props) {
 *         ...
 *         this.sortable = new Sortable();
 *         ...
 *     }
 *     render() {
 *         return <ul ref={ el => this.sortable.register(el) }>...</ul>
 *     }
 * }
 * ```
 */
class Sortable {
    /**
     */
    constructor() {
        this.el = null;
        this.instance = null;
    }
    /**
     * @param {HTMLElement} el
     * @param {Object} options github.com/SortableJS/Sortable#options
     */
    register(el, options) {
        if (!el || this.el === el)
            return;
        this.el = el;
        this.instance = window.Sortable.create(el, Object.assign({
            group: `instance-${++counter}`,
            animation: 100,
        }, options));
    }
    /**
     * @return {Object}
     */
    getImpl() {
        return this.instance;
    }
}

export default Sortable;
