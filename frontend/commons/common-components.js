import services from './common-services.js';

const $el = preact.createElement;

/**
 * @param {Object} content
 */
function View(props) {
    return $el('div', {id: 'view'}, $el('div', null,
        $el('button', {onClick: () => services.redirect('/'),
                       className: 'icon-button'},
            $el(FeatherSvg, {iconId: 'x'})
        ),
        props.children
    ));
}

/**
 * @param {{label: string|function; id?: string; className?: string; inline?: boolean;}} props
 */
function InputGroup(props) {
    const id = props.id || (props.children && props.children.props && props.children.props.id);
    return $el('div', {className: (!props.inline ? 'input-group' : 'input-group-inline') +
                                  (!props.className ? '' : ` ${props.className}`)},
        props.children,
        $el('label', id ? {for: id} : null,
            typeof props.label === 'string' ? props.label : $el(props.label)
        )
    );
}

class Form extends preact.Component {
    /**
     * @param {FormProps} props
     */
    constructor(props) {
        super(props);
        if (!props.onConfirm) throw new TypeError('props.onConfirm() is required.');
    }
    /**
     * @access protected
     */
    render() {
        return $el('form', {onSubmit: e => this.handleSubmit(e)},
            this.props.children,
            $el('div', {className: 'form-buttons'},
                $el('button', {
                    className: 'nice-button primary',
                    type: 'submit',
                    disabled: this.doDisableConfirmButton()
                }, this.props.confirmButtonText || 'Ok'),
                $el(MyLink, {to: '/'}, this.props.cancelButtonText || 'Cancel')
            )
        );
    }
    /**
     * @access private
     */
    handleSubmit(e) {
        e.preventDefault();
        const res = this.props.onConfirm(e);
        if (res && res instanceof Promise && this.props.autoClose !== false) {
            res.then(() => this.close());
            return;
        }
        if (this.props.autoClose !== false) {
            this.close();
        }
    }
    /**
     * @access public
     */
    static receiveInputValue(e, dhis, name) {
        dhis.setState({[name || e.target.name]: e.target.value});
    }
    /**
     * @access private
     */
    cancel(e) {
        if (this.props.onCancel) this.props.onCancel(e);
        this.close();
    }
    /**
     * @access private
     */
    doDisableConfirmButton() {
        return typeof this.props.doDisableConfirmButton === 'function'
            ? this.props.doDisableConfirmButton()
            : false;
    }
    /**
     * @access protected
     */
    close() {
        if (this.props.close) {
            this.props.close();
            return;
        }
        services.redirect('/');
    }
}

/**
 * Sets window.parent.location.hash = '#' + $to (or window.parent.location.href = $to
 * if $full = true).
 *
 * @param {{to: string; full?: bool; attrs?: Object;}} props
 */
function MyLink(props) {
    return $el('a', Object.assign({
        href: (!props.full ? '#' : '') + props.to.split('?')[0],
        onClick: e => {
            e.preventDefault();
            services.redirect(props.to, props.full);
        },
    }, props.attrs), props.children);
}

/**
 * @param {{iconId: string;}} eg. 'activity' (see: feathericons.com)
 */
function FeatherSvg(props) {
    return $el('svg', {className: 'feather'},
        $el('use', {'xlink:href': services.config.assetBaseUrl + 'frontend/assets/feather-sprite.svg#' + props.iconId},
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
     * @param {string|function} message
     * @param {string} level
     */
    addMessage(message, level) {
        this.state.messages.unshift({message, level,
            timeoutId: setTimeout(this.removeMessage.bind(this),
                                  this.autoCloseTimeoutMillis)});
        this.setState({messages: this.state.messages});
    }
    /**
     * @param {{message: string|function; level: string; timeoutId: number;}?} message
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
                let iconId = 'check';
                if (message.level === 'error') iconId = 'alert-triangle';
                if (message.level === 'info') iconId = 'info';
                return $el('div', {className: 'toaster-message ' + message.level,
                                   onClick: () => this.removeMessage(message)},
                    $el(FeatherSvg, {iconId}),
                    typeof message.message !== 'function'
                        ? $el('span', null, message.message)
                        : $el(message.message)
                );
            })
        );
    }
}

class Tabs extends preact.Component {
    /**
     * @param {Object} props
     */
    constructor(props) {
        super(props);
        this.state = {tabIdx: 0};
    }
    /**
     * @access protected
     */
    render() {
        return $el('div', {className: 'tab-links'},
            ...this.props.items.map((text, i) =>
                $el('button', {className: this.state.tabIdx !== i ? '' : 'current',
                               onClick: () => this.setCurrentTab(i)}, text)
            )
        );
    }
    /**
     * @access private
     */
    setCurrentTab(idx) {
        if (this.state.tabIdx === idx) return;
        this.setState({tabIdx: idx});
        this.props.onChange(idx);
    }
}

export {View, InputGroup, Form, MyLink, FeatherSvg, Toaster, Tabs};
