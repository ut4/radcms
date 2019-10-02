/**
 * @param {string|VDOMNode} content
 */
function view(content) {
    return $el('div', {className: 'view'},
        $el('button', {onClick: () => myRedirect('/')}, featherSvg('x')),
        content
    );
}

class Form extends preact.Component {
    /**
     * @param {Object} props {
     *     onConfirm: (e: Event) => any;
     *     onCancel?: (e: Event) => any;
     *     close?: Function;
     *     doDisableConfirmButton?: () => boolean;
     *     noAutoClose?: bool;
     *     confirmButtonText?: string;
     *     cancelButtonText?: string;
     * }
     */
    constructor(props) {
        super(props);
        if (!props.onConfirm) throw new TypeError('props.onConfirm() is required.');
    }
    render() {
        return $el('form', {onSubmit: e => this.confirm(e)},
            this.props.children,
            $el('div', {className: 'form-buttons'},
                $el('button', {
                    className: 'nice-button nice-button-primary',
                    type: 'submit',
                    disabled: this.doDisableConfirmButton()
                }, this.props.confirmButtonText || 'Ok'),
                $el('button', {
                    className: 'text-button',
                    type: 'button',
                    onClick: e => this.cancel(e)
                }, this.props.cancelButtonText || 'Cancel')
            )
        );
    }
    confirm(e) {
        e.preventDefault();
        const res = this.props.onConfirm(e);
        if (!this.props.noAutoClose && res && res instanceof Promise) {
            res.then(() => this.close());
            return;
        }
        if (!this.props.noAutoClose) {
            this.close();
        }
    }
    static receiveInputValue(e, dhis, name) {
        dhis.setState({[name || e.target.name]: e.target.value});
    }
    cancel(e) {
        if (this.props.onCancel) this.props.onCancel(e);
        this.close();
    }
    doDisableConfirmButton() {
        return typeof this.props.doDisableConfirmButton === 'function'
            ? this.props.doDisableConfirmButton()
            : false;
    }
    close() {
        if (this.props.close) {
            this.props.close();
            return;
        }
        myRedirect('/');
    }
}

/**
 * Sets window.parent.location.hash = '#' + $to (or window.parent.location.href = $to
 * if $full = true).
 *
 * @param {string} to eg. '/edit-content/1'
 * @param {string|VDOMNode} children eg. 'Edit content' or $el('span', null, 'foo')
 * @param {bool?} full = false
 * @param {Object?} attrs = null
 */
function myLink(to, children, full, attrs) {
    let props = {
        href: (!full ? '#' : '') + to.split('?')[0],
        onclick: e => {
            e.preventDefault();
            myRedirect(to, full);
        },
    };
    if (attrs) for (const key in attrs) {
        props[key] = attrs[key];
    }
    return $el('a', props, children);
}

/**
 * @param {Object} props {
 *     cnodes: Array<Object>;
 *     createLinkText: string;
 *     currentPageUrl: string;
 *     contentType?: string;
 * }
 */
function contentNodeList(props) {
    return [
        $el('ul', null, props.cnodes.map(c =>
            $el('li', null, [
                $el('span', null, c.defaults.name),
                myLink('/edit-content/' + c.defaults.id + '?returnTo=' +
                       encodeURIComponent(props.currentPageUrl), 'Edit')
            ])
        )),
        $el('div', null, myLink(
            '/add-content' + (!props.contentType ? '' : '/' + props.contentType) +
                '?returnTo=' + encodeURIComponent(props.currentPageUrl),
            props.createLinkText || 'Create content'
        ))
    ];
}

/**
 * @param {string} iconId eg. 'activity' (see: feathericons.com)
 */
function featherSvg(iconId) {
    return $el('svg', {className: 'feather'},
        $el('use', {'xlink:href': 'frontend/assets/feather-sprite.svg#' + iconId},
            null)
    );
}

class Toaster extends preact.Component {
    /**
     * @param {{autoCloseTimeoutMillis?: number; publishFactoryTo?: Object;}} props
     */
    constructor(props) {
        super(props);
        (props.publishFactoryTo || window).toast = this.addMessage.bind(this);
        this.autoCloseTimeoutMillis = props.autoCloseTimeoutMillis || 8000;
        this.state = {messages: []};
    }
    /**
     * @param {string} message
     * @param {string} level
     */
    addMessage(message, level) {
        this.state.messages.unshift({message, level,
            timeoutId: setTimeout(this.removeMessage.bind(this),
                                  this.autoCloseTimeoutMillis)});
        this.setState({messages: this.state.messages});
    }
    /**
     * @param {{message: string; level: string; timeoutId: number;}?} message
     */
    removeMessage(message) {
        const messages = this.state.messages;
        if (!message) { // from timeout
            messages.pop();
        } else { // from onClick
            clearTimeout(message.timeoutId);
            messages.splice(messages.indexOf(message), 1);
        }
        this.setState({messages});
    }
    render() {
        if (!this.state.messages.length) return;
        return $el('div', {className: 'toaster'},
            this.state.messages.map(message => {
                let icon = 'check';
                if (message.level == 'error') icon = 'alert-triangle';
                if (message.level == 'info') icon = 'info';
                return $el('div', {className: 'toaster-message ' + message.level,
                                   onClick: () => this.removeMessage(message)},
                    featherSvg(icon),
                    $el('span', null, message.message)
                );
            })
        );
    }
}

export {view, Form, myLink, contentNodeList, featherSvg, Toaster};