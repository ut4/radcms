import {http, urlUtils, View, FormButtons, hookForm, InputGroup, Input, InputError} from '@rad-commons';

/**
 * #/pack-website
 */
class WebsitePackView extends preact.Component {
    constructor(props) {
        super(props);
        this.state = Object.assign(hookForm(this, {signingKey: genRandomString(32)}), {
            templates: [],
            assets: [],
            uploads: [],
            message: ''
        });
        this.templatesInputEl = preact.createRef();
        this.assetsInputEl = preact.createRef();
        this.uploadsInputEl = preact.createRef();
        http.get('/api/packager/pre-run')
            .then(preview => {
                const toSelectable = fileName => ({fileName, selected: true});
                this.setState({
                    templates: preview.templates.map(toSelectable),
                    assets: preview.assets.map(toSelectable),
                    uploads: preview.uploads.map(toSelectable),
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
                           method="post">
            <h2>Paketoi sivusto</h2>
            { [{group: 'templates', title: 'Templaatit'},
               {group: 'assets', title: 'Css/Js'},
               {group: 'uploads', title: 'Lataukset'}].map(({group, title}) =>
                this.state[group] ? <div class="container" key={ group }>
                    <h3>{ title }</h3>
                    <label class="text-pale">
                        <input onChange={ e => this.toggleAll(e, group) }
                            type="checkbox"
                            defaultChecked/>(Kaikki)
                    </label>
                    <div>{ this.state[group].map((t, i) =>
                        <div key={ i }><label>
                            <input onChange={ e => this.toggleIsSelected(t, e, group) }
                                value={ t.selected }
                                type="checkbox"
                                checked={ t.selected }/>{ t.fileName }
                        </label></div>
                    ) }</div>
                </div> : null
            ) }
            { this.state.message ? <p>
                { this.state.message }
            </p> : null }
            <InputGroup classes={ this.state.classes.signingKey }>
                <label htmlFor="signingKey">Salausavain</label>
                <Input
                    vm={ this }
                    name="signingKey"
                    id="signingKey"
                    validations={ [['minLength', 12]] }/>
                <InputError error={ this.state.errors.signingKey }/>
            </InputGroup>
            <input ref={ this.templatesInputEl } type="hidden" name="templates" value=""/>
            <input ref={ this.assetsInputEl } type="hidden" name="assets" value=""/>
            <input ref={ this.uploadsInputEl } type="hidden" name="uploads" value=""/>
            <FormButtons submitButtonText="Paketoi"/>
        </form></View>;
    }
    /**
     * @access private
     */
    toggleIsSelected(file, e, group) {
        file.selected = e.target.checked;
        this.setState({[group]: this.state[group]});
    }
    /**
     * @access private
     */
    toggleAll(e, group) {
        const to = e.target.checked;
        this.setState({[group]: this.state[group].map(file => {
            file.selected = to;
            return file;
        })});
    }
    /**
     * @access private
     */
    handleSubmit(e) {
        if (!this.form.handleSubmit(e))
            return;
        ['templates', 'assets', 'uploads'].forEach(group => {
            this[`${group}InputEl`].current.value = JSON.stringify(this.state[group]
                .filter(asset => asset.selected)
                .map(asset => asset.fileName));
        });
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
