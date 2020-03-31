import {Form, InputGroup, Input, InputErrors} from '@rad-commons';

class FromPackageInstallerView extends preact.Component {
    /**
     * @param {{siteDirPath: string; baseUrl: string;}} props
     */
    constructor(props) {
        super(props);
        this.state = {
            unlockKey: 'my-unlock-key',
        };
    }
    /**
     * @access protected
     */
    render() {
        return <div>
            <h2>Asenna RadCMS</h2>
            <Form onSubmit={ e => this.handleSubmit(e) } action="?q=/from-package" method="post" encType="multipart/form-data" omitButtons>
                <InputGroup label="Pakettitiedosto">
                    <Input
                        name="packageFile"
                        id="packageFile"
                        type="file"
                        accept=".radsite"
                        validations={ [['required']] }/>
                    <InputErrors/>
                </InputGroup>
                <InputGroup label="Avausavain">
                    <Input
                        onInput={ e => Form.receiveInputValue(e, this) }
                        value={ this.state.unlockKey }
                        name="unlockKey"
                        validations={ [['minLength', 12]] }/>
                    <InputErrors/>
                </InputGroup>
                <input type="hidden" name="baseUrl" value={ this.props.baseUrl }/>
                <button class="nice-button primary"
                        type="submit">Asenna</button>
            </Form>
        </div>;
    }
    /**
     * @access private
     */
    handleSubmit(e) {
        e.target.submit();
    }
}

export default FromPackageInstallerView;
