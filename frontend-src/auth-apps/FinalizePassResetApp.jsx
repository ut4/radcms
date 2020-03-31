import {urlUtils, Form, InputGroup, Input, InputErrors, http} from '@rad-commons';
import {translateError} from './commons.js';

class FinalizePassResetApp extends preact.Component {
    /**
     * @param {Object} props
     */
    constructor(props) {
        super(props);
        this.state = {newPassword: '', email: '', message: null};
    }
    /**
     * @access protected
     */
    render() {
        return <Form onSubmit={ e => this.handleSubmit(e) } buttons={ ['submit'] }
                    submitButtonText="Tallenna uusi salasana">
            <img src={ urlUtils.makeAssetUrl('frontend/assets/logo.png') }/>
            { !this.state.message
                ? null
                : <div class={ `container box ${this.state.message.level}` }>{ this.state.message.text }</div>
            }
            <InputGroup label="Uusi salasana">
                <Input onInput={ e => this.setState({newPassword: e.target.value}) }
                       value={ this.state.newPassword }
                       type="password"
                       id="newPassword"
                       validation={ [['required']] }/>
                <InputErrors/>
            </InputGroup>
            <InputGroup label="Email">
                <Input onInput={ e => this.setState({email: e.target.value}) }
                       value={ this.state.email }
                       id="email"
                       validation={ [['required']] }/>
                <InputErrors/>
            </InputGroup>
        </Form>;
    }
    /**
     * @access private
     */
    handleSubmit() {
        http.post('/api/finalize-password-reset',
                  {newPassword: this.state.newPassword,
                   email: this.state.email,
                   key: location.pathname.split('/').pop()})
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
                this.setState({message: {text: 'Jokin meni pieleen.',
                                         level: 'error'}});
            });
    }
}

export default FinalizePassResetApp;
