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
                $el('input', {
                    value: this.props.confirmButtonText || 'Ok',
                    className: 'nice-button nice-button-primary',
                    type: 'submit',
                    disabled: this.doDisableConfirmButton()
                }, null),
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
 * Sets parent.window.hash = '#' + $to.
 *
 * @param {string} to eg. '/edit-content/1'
 * @param {text} to eg. 'Edit content'
 */
function myLink(to, text) {
    return $el('a', {
        href: '#' + to.split('?')[0],
        onclick: e => {
            e.preventDefault();
            myRedirect(to);
        },
    }, text);
}

/**
 * @param {Object} props {
 *     cnodes: Object[];
 *     createLinkText: string;
 *     currentPageUrl: string;
 *     contentType?: string;
 *     urlToRescanAfterSubmit?: string;
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
            '?returnTo=' + encodeURIComponent(props.currentPageUrl) +
            (props.urlToRescanAfterSubmit
                ? '&urlToRescanAfterSubmit=' + encodeURIComponent(props.urlToRescanAfterSubmit)
                : ''),
            props.createLinkText || 'Create content'
        ))
    ];
}

export {Form, myLink, contentNodeList};
