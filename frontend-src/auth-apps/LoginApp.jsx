import {http, services, urlUtils, hookForm, InputGroup, Input, InputError, FormButtons} from '@rad-commons';
import {translateError} from './commons.js';

class LoginApp extends preact.Component {
    /**
     * @param {Object} props
     */
    constructor(props) {
        super(props);
        this.state = Object.assign(
            hookForm(this, {username: '', password: ''}),
            {message: !location.search.endsWith('?from-logout')
                ? null
                : {text: 'Olet nyt kirjautunut ulos.', level: 'info'}}
        );
    }
    /**
     * @access protected
     */
    render() {
        const {errors, classes, message} = this.state;
        return <form onSubmit={ e => this.handleSubmit(e) }>
            <div class="text-center">
                <img src={ urlUtils.makeAssetUrl('frontend/assets/rad-logo.svg') }/>
            </div>
            { !message
                ? null
                : <div class={ `container box ${message.level} mb-2` }>{ message.text }</div>
            }
            <InputGroup classes={ classes.username }>
                <label htmlFor="username" class="form-label">Käyttäjänimi</label>
                <Input vm={ this } name="username" id="username" errorLabel="Käyttäjänimi"
                    validations={ [['required']] }/>
                <InputError error={ errors.username }/>
            </InputGroup>
            <InputGroup classes={ classes.password }>
                <label htmlFor="password" class="form-label">Salasana</label>
                <Input vm={ this } name="password" id="password" errorLabel="Salasana"
                       validations={ [['required']] } type="password"/>
                <InputError error={ errors.password }/>
            </InputGroup>
            <div class="columns col-centered mt-10">
                <div class="column">
                    <FormButtons
                        buttons={ ['submit'] }
                        submitButtonText="Kirjaudu"
                        className="mt-0"/>
                </div>
                <a href={ urlUtils.makeUrl('/request-password-reset') }>Unohtuiko salasana?</a>
            </div>
        </form>;
    }
    /**
     * @access private
     */
    handleSubmit(e) {
        if (!this.form.handleSubmit(e))
            return;
        http.post('/api/login', {username: this.state.values.username,
                                 password: this.state.values.password})
            .then(info => {
                if (info.ok) {
                    services.sessionStorage.radMessage = JSON.stringify([
                        'Olet nyt kirjautunut sisään.', 'success'
                    ]);
                    window.location.href = urlUtils.makeUrl('/_edit');
                }
                else if (info.err) this.setState({message: {text: translateError(info.err),
                                                            level: 'error'}});
                else throw new Error('wut?');
            })
            .catch(() => {
                this.setState({message: {text: 'Jokin meni pieleen.',
                                         level: 'error'}});
            });
    }
}

export default LoginApp;
