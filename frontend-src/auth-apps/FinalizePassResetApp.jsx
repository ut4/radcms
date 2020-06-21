import {http, urlUtils, hookForm, InputGroup, Input, InputError, FormButtons} from '@rad-commons';
import {translateError} from './commons.js';

class FinalizePassResetApp extends preact.Component {
    /**
     * @param {Object} props
     */
    constructor(props) {
        super(props);
        this.state = Object.assign(
            hookForm(this, {newPassword: '', email: ''}),
            {message: null}
        );
    }
    /**
     * @access protected
     */
    render() {
        return <form onSubmit={ e => this.handleSubmit(e) }>
            <div class="text-center">
                <img src={ urlUtils.makeAssetUrl('frontend/assets/rad-logo.svg') }/>
            </div>
            { !this.state.message
                ? null
                : <div class={ `container box ${this.state.message.level}` }>{ this.state.message.text }</div>
            }
            <InputGroup classes={ this.state.classes.newPassword }>
                <label htmlFor="newPassword" class="form-label">Uusi salasana</label>
                <Input vm={ this } name="newPassword" id="newPassword" errorLabel="Uusi salasana"
                       type="password"
                       validations={ [['required']] }/>
                <InputError error={ this.state.errors.newPassword }/>
            </InputGroup>
            <InputGroup classes={ this.state.classes.email }>
                <label htmlFor="email" class="form-label">Email</label>
                <Input vm={ this } name="email" id="email" errorLabel="Email"
                       validations={ [['required']] }/>
                <InputError error={ this.state.errors.email }/>
            </InputGroup>
            <FormButtons
                buttons={ ['submit'] }
                submitButtonText="Tallenna uusi salasana"/>
        </form>;
    }
    /**
     * @access private
     */
    handleSubmit(e) {
        if (!this.form.handleSubmit(e))
            return;
        http.post('/api/finalize-password-reset',
                  {newPassword: this.state.values.newPassword,
                   email: this.state.values.email,
                   key: location.href.split('/').pop()})
            .then(info => {
                if (info.ok) this.setState({message: {
                    text: <div>Salasana päivitetty. <a href={ urlUtils.makeUrl('/login') }>Kirjaudu tästä</a>.</div>,
                    level: 'info',
                }});
                else if (info.err) this.setState({message: {
                    text: translateError(info.err),
                    level: 'error',
                }});
                else throw new Error('wut?');
            })
            .catch(() => {
                this.setState({message: {text: 'Jokin meni pieleen.', level: 'error'}});
            });
    }
}

export default FinalizePassResetApp;
