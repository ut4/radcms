import {urlUtils, Form, InputGroup, Input, InputErrors, http} from '@rad-commons';
import {translateError} from './commons.js';

class LoginApp extends preact.Component {
    /**
     * @param {Object} props
     */
    constructor(props) {
        super(props);
        this.state = {
            username: '',
            password: '',
            message: location.search !== '?from-logout'
                ? null
                : {text: 'Olet nyt kirjautunut ulos.', level: 'info'}
        };
    }
    /**
     * @access protected
     */
    render() {
        return <Form onSubmit={ e => this.handleSubmit(e) } omitButtons>
            <img src={ urlUtils.makeAssetUrl('frontend/assets/logo.png') }/>
            { !this.state.message
                ? null
                : <div class={ `container box ${this.state.message.level}` }>{ this.state.message.text }</div>
            }
            <InputGroup label="Käyttäjänimi">
                <Input onInput={ e => this.setState({username: e.target.value}) }
                       value={ this.state.username }
                       id="username"
                       validations={ [['required']] }/>
                <InputErrors/>
            </InputGroup>
            <InputGroup label="Salasana">
                <Input onInput={ e => this.setState({password: e.target.value}) }
                       value={ this.state.password }
                       type="password"
                       id="password"
                       validations={ [['required']] }/>
                <InputErrors/>
            </InputGroup>
            <div class="form-buttons">
                <button class="nice-button" type="submit">Kirjaudu</button>
            </div>
            <div>
                <a href={ urlUtils.makeUrl('/request-password-reset') }>Unohtuiko salasana?</a>
            </div>
        </Form>;
    }
    /**
     * @access private
     */
    handleSubmit() {
        http.post('/api/login', {username: this.state.username,
                                 password: this.state.password})
            .then(info => {
                if (info.ok) window.location.href = urlUtils.makeUrl('/edit');
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
