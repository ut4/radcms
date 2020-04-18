import {http, services, urlUtils, hookForm, InputGroup2, Input2, InputError2} from '@rad-commons';
import {translateError} from './commons.js';

class LoginApp extends preact.Component {
    /**
     * @param {Object} props
     */
    constructor(props) {
        super(props);
        this.state = Object.assign(
            hookForm(this, {username: '', password: ''}),
            {message: location.search !== '?from-logout'
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
            <img src={ urlUtils.makeAssetUrl('frontend/assets/logo.png') }/>
            { !message
                ? null
                : <div class={ `container box ${message.level}` }>{ message.text }</div>
            }
            <InputGroup2 classes={ classes.username }>
                <label htmlFor="username">Käyttäjänimi</label>
                <Input2 vm={ this } name="username" id="username" errorLabel="Käyttäjänimi"
                    validations={ [['required']] }/>
                <InputError2 error={ errors.username }/>
            </InputGroup2>
            <InputGroup2 classes={ classes.password }>
                <label htmlFor="password">Salasana</label>
                <Input2 vm={ this } name="password" id="password" errorLabel="Salasana"
                       validations={ [['required']] } type="password"/>
                <InputError2 error={ errors.password }/>
            </InputGroup2>
            <div class="form-buttons">
                <button class="nice-button" type="submit">Kirjaudu</button>
            </div>
            <div>
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
                    window.location.href = urlUtils.makeUrl('/edit');
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
