import {Form, InputGroup, Input} from '@rad-commons';

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
            <form action="?q=/from-package" method="POST" encType="multipart/form-data">
                <InputGroup label="Pakettitiedosto">
                    <Input
                        name="packageFile"
                        id="packageFile"
                        type="file"
                        accept=".radsite"
                        required/>
                </InputGroup>
                <InputGroup label="Avausavain">
                    <Input
                        onInput={ e => Form.receiveInputValue(e, this) }
                        value={ this.state.unlockKey }
                        name="unlockKey"
                        minlength="12"
                        required/>
                </InputGroup>
                <input type="hidden" name="baseUrl" value={ this.props.baseUrl }/>
                <br/>
                <button class="nice-button primary"
                        type="submit">Asenna</button>
            </form>
        </div>;
    }
}

export default FromPackageInstallerView;
