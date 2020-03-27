import {http, urlUtils, View, InputGroup, Form, Input, InputErrors} from '@rad-commons';

/**
 * #/pack-website
 */
class WebsitePackView extends preact.Component {
    constructor(props) {
        super(props);
        this.state = {templates: [],
                      assets: [],
                      signingKey: genRandomString(32),
                      message: ''};
        this.templatesInputEl = preact.createRef();
        this.assetsInputEl = preact.createRef();
        http.get('/api/packager/pre-run')
            .then(preview => {
                this.setState({
                    templates: preview.templates.map(fileName =>
                        ({fileName, selected: true})),
                    assets: preview.assets.map(fileName =>
                        ({fileName, selected: true})),
                });
            })
            .catch(e => {
                this.setState({message: e.message || 'Jokin meni pieleen.'});
            });
    }
    /**
     * @access protected
     */
    render() {
        return <View><Form onSubmit={ e => this.handleSubmit(e) }
                           submitButtonText="Paketoi"
                           action={ urlUtils.makeUrl('/api/packager') }
                           method="post">
            <h2>Paketoi sivusto</h2>
            { this.state.templates ? <div class="container">
                <h3>Templaatit</h3>
                <label class="text-pale">
                    <input onChange={ e => this.toggleAll(e, 'templates') }
                        type="checkbox"
                        defaultChecked/>(Kaikki)
                </label>
                <div>{ this.state.templates.map((t, i) =>
                    <div key={ i }><label>
                        <input onChange={ e => this.toggleIsSelected(t, e, 'templates') }
                               value={ t.selected }
                               type="checkbox"
                               checked={ t.selected }/>{ t.fileName }
                    </label></div>
                ) }</div>
            </div> : null }
            { this.state.assets ? <div class="container">
                <h3>Css/Js</h3>
                <label class="text-pale">
                    <input onChange={ e => this.toggleAll(e, 'assets') }
                        type="checkbox"
                        defaultChecked/>(Kaikki)
                </label>
                <div>{ this.state.assets.map((a, i) =>
                    <div key={ i }><label>
                        <input onChange={ e => this.toggleIsSelected(a, e, 'assets') }
                               value={ a.selected }
                               type="checkbox"
                               checked={ a.selected }/>{ a.fileName }
                    </label></div>
                ) }</div>
            </div> : null }
            { this.state.message ? <p>
                { this.state.message }
            </p> : null }
            <InputGroup label="Salausavain">
                <Input
                    onInput={ e => Form.receiveInputValue(e, this) }
                    value={ this.state.signingKey }
                    name="signingKey"
                    validations={ [['minLength', 12]] }/>
                <InputErrors/>
            </InputGroup>
            <input ref={ this.templatesInputEl } type="hidden" name="templates" value=""/>
            <input ref={ this.assetsInputEl } type="hidden" name="assets" value=""/>
        </Form></View>;
    }
    /**
     * @access private
     */
    toggleIsSelected(file, e, collection) {
        file.selected = e.target.checked;
        this.setState({[collection]: this.state[collection]});
    }
    /**
     * @access private
     */
    toggleAll(e, collection) {
        const to = e.target.checked;
        this.setState({[collection]: this.state[collection].map(file => {
            file.selected = to;
            return file;
        })});
    }
    /**
     * @access private
     */
    handleSubmit(e) {
        e.preventDefault();
        const onlySelected = asset => asset.selected;
        const onlyFileName = asset => asset.fileName;
        this.templatesInputEl.current.value = JSON.stringify(
            this.state.templates.filter(onlySelected).map(onlyFileName)
        );
        this.assetsInputEl.current.value = JSON.stringify(
            this.state.assets.filter(onlySelected).map(onlyFileName)
        );
        e.target.submit();
    }
}

// https://stackoverflow.com/a/44678459
function genRandomString(len) {
    const p = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
    return [...Array(len)].reduce(a=>a+p[~~(Math.random()*p.length)],'');
}

export default WebsitePackView;
export {genRandomString};
