
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

export {Form};
