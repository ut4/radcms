import {http, urlUtils, View, InputGroup, Form, Input} from '@rad-commons';

/**
 * #/pack-website
 */
class WebsitePackView extends preact.Component {
    constructor(props) {
        super(props);
        this.state = {templates: [],
                      themeAssets: [],
                      signingKey: randomString(32),
                      message: ''};
        this.templatesInputEl = preact.createRef();
        this.themeAssetsInputEl = preact.createRef();
        http.get('/api/packager/pre-run')
            .then(preview => {
                this.setState({
                    templates: preview.templates.map(fileName =>
                        ({fileName, selected: true})),
                    themeAssets: preview.themeAssets.map(fileName =>
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
        return <View><form onSubmit={ e => this.handleSubmit(e) }
                           action={ urlUtils.makeUrl('/api/packager') }
                           method="POST">
            <h2>Paketoi sivusto</h2>
            { this.state.templates ? <div>
                <h3>Templaatit</h3>
                <ul>{ this.state.templates.map(t =>
                    <li><label>
                        <input onClick={ e => this.toggleIsSelected(t, e, 'templates') }
                               value={ t.selected }
                               type="checkbox"
                               defaultChecked/>{ t.fileName }
                    </label></li>
                ) }</ul>
            </div> : null }
            { this.state.themeAssets ? <div>
                <h3>Css/Js</h3>
                <ul>{ this.state.themeAssets.map(a =>
                    <li><label>
                        <input onClick={ e => this.toggleIsSelected(a, e, 'themeAssets') }
                               value={ a.selected }
                               type="checkbox"
                               defaultChecked/>{ a.fileName }
                    </label></li>
                ) }</ul>
            </div> : null }
            { this.state.message ? <p>
                { this.state.message }
            </p> : null }
            <InputGroup label="Salausavain">
                <Input
                    onInput={ e => Form.receiveInputValue(e, this) }
                    value={ this.state.signingKey }
                    name="signingKey"
                    minlength="12"
                    required/>
            </InputGroup>
            <div class="form-buttons">
                <button class="nice-button primary">Paketoi</button>
                <a href="#/">Peruuta</a>
            </div>
            <input ref={ this.templatesInputEl } type="hidden" name="templates" value=""/>
            <input ref={ this.themeAssetsInputEl } type="hidden" name="themeAssets" value=""/>
        </form></View>;
    }
    /**
     * @access private
     */
    toggleIsSelected(file, e, type) {
        file.selected = e.target.checked;
        this.setState({[type]: this.state[type]});
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
        this.themeAssetsInputEl.current.value = JSON.stringify(
            this.state.themeAssets.filter(onlySelected).map(onlyFileName)
        );
        e.target.submit();
    }
}

// https://stackoverflow.com/a/44678459
function randomString(len) {
    const p = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
    return [...Array(len)].reduce(a=>a+p[~~(Math.random()*p.length)],'');
}

export default WebsitePackView;
