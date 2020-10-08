import {http, View, hookForm, InputGroup, Input, InputError, FeatherSvg, myFetch,
        Toaster, toasters} from '@rad-commons';

/**
 * #/pack-website: näkymä, jolla admin voi luoda tämänhetkisestä sivuston sisäl-
 * löstä asennettavan paketin.
 */
class WebsitePackView extends preact.Component {
    constructor(props) {
        super(props);
        this.state = Object.assign(hookForm(this, {signingKey: genRandomString(32)}), {
            templates: [],
            assets: [],
            uploads: [],
            plugins: [],
            tabs: [{isCurrent: true,  cleared: false},
                   {isCurrent: false, cleared: false},
                   {isCurrent: false, cleared: false},
                   {isCurrent: false, cleared: false},
                   {isCurrent: false, cleared: false}],
        });
        this.tabInfo = [
            {groupName: 'templates', title: 'Templaatit', dataFetched: false, noItemsLabel: 'Templaatteja'},
            {groupName: 'assets', title: 'Css/Js', dataFetched: false, noItemsLabel: 'Tiedostoja'},
            {groupName: 'uploads', title: 'Lataukset', dataFetched: false, noItemsLabel: 'Latauksia'},
            {groupName: 'plugins', title: 'Lisäosat', dataFetched: false, noItemsLabel: 'Lisäosia'},
            {groupName: 'overview', title: 'Yhteenveto', dataFetched: false, noItemsLabel: ''},
        ];
        this.fetchIncludables(0);
    }
    /**
     * @access public
     */
    next(tabIdx) {
        if (tabIdx < this.state.tabs.length - 1) {
            const tabs = this.state.tabs;
            tabs[tabIdx].isCurrent = false;
            tabs[tabIdx].cleared = true;
            tabs[tabIdx + 1].isCurrent = true;
            this.fetchIncludables(tabIdx + 1);
            this.setState({tabs});
            return;
        }
    }
    /**
     * @access public
     */
    goBack(toIdx) {
        const tabs = this.state.tabs;
        tabs[toIdx].cleared = false;
        tabs[toIdx].isCurrent = true;
        tabs[toIdx + 1].cleared = false;
        tabs[toIdx + 1].isCurrent = false;
        this.fetchIncludables(toIdx);
        this.setState(tabs);
    }
    /**
     * @access public
     */
    toggleIsSelected(selectable, e, group) {
        selectable.selected = e.target.checked;
        this.setState({[group]: this.state[group]});
    }
    /**
     * @access public
     */
    toggleAll(e, group) {
        const to = e.target.checked;
        this.setState({[group]: this.state[group].map(selectable => {
            selectable.selected = to;
            return selectable;
        })});
    }
    /**
     * @access protected
     */
    render() {
        return <View>
            <h2>Paketoi sivusto</h2>
            <nav class="step-indicators">{ this.state.tabs.map((tab, i) =>
                <div
                    onClick={ () => this.selectTab(i) }
                    class={ tab.isCurrent ? 'current' : '' +
                            (tab.cleared ? ' checked' : '' ) }
                    key={ this.tabInfo[i].groupName }>{ this.tabInfo[i].title }
                    <FeatherSvg iconId="check"/>
                </div>
            ) }</nav>
            { this.tabInfo.slice(0, this.tabInfo.length - 1).map((tabInfo, i) =>
                <CheckboxListTab
                    tabInfo={ tabInfo }
                    className={ `checkbox-list${!this.state.tabs[i].isCurrent ? ' hidden' : ''}` }
                    parent={ this }
                    key={ tabInfo.groupName }
                    tabIdx={ i }/>
            ) }
            <form
                onSubmit={ e => this.handleSubmit(e) }
                class={ `${!this.state.tabs[4].isCurrent ? ' hidden' : ''}` }>
                <InputGroup classes={ this.state.classes.signingKey }>
                    <label htmlFor="signingKey" class="form-label">Salausavain</label>
                    <Input
                        vm={ this }
                        name="signingKey"
                        id="signingKey"
                        validations={ [['minLength', 32]] }
                        errorLabel="Salausavain"/>
                    <InputError error={ this.state.errors.signingKey }/>
                </InputGroup>
                <Toaster id="packSite"/>
                <button onClick={ () => this.goBack(3) } class="btn btn-link mt-8"
                        type="button">&lt; Edellinen</button>
                <button class="btn btn-primary mt-8"
                        type="submit">Paketoi</button>
            </form>
        </View>;
    }
    /**
     * @access private
     */
    fetchIncludables(forTab) {
        if (forTab >= this.tabInfo.length - 1 || this.tabInfo[forTab].dataFetched)
            return;
        http.get(`/api/packager/includables/${this.tabInfo[forTab].groupName}`)
            .then(items => {
                this.tabInfo[forTab].dataFetched = true;
                const toSelectable = value => ({value, selected: true});
                this.setState({
                    [this.tabInfo[forTab].groupName]: items.map(toSelectable),
                });
            });
    }
    /**
     * @access private
     */
    selectTab(tabIdx) {
        if (!this.state.tabs[tabIdx].isCurrent) {
            this.fetchIncludables(tabIdx);
            this.setState({tabs: this.state.tabs.map((t, i) =>
                Object.assign(t, {isCurrent: i === tabIdx})
            )});
        }
    }
    /**
     * @access private
     */
    handleSubmit(e) {
        if (!this.form.handleSubmit(e))
            return;
        myFetch('/api/packager', {
            method: 'POST',
            responseType: 'blob',
            headers: {'Content-Type': 'application/json'},
            data: JSON.stringify(['templates', 'assets', 'uploads', 'plugins'].reduce((obj, group) => {
                obj[group] = this.state[group]
                    .filter(selectable => selectable.selected)
                    .map(selectable => selectable.value);
                return obj;
            }, {
                signingKey: this.state.values.signingKey
            }))
        })
        .then(res => {
            if (res.status === 200)
                window.saveAs(res.response, `${genRandomString(32)}.radsite`);
            else
                toasters.packSite('Jokin meni pieleen.', 'error');
        });
    }
}

class CheckboxListTab extends preact.Component {
    /**
     * @param {{tabInfo: Object; parent: WebsitePackView; tabIdx: number; className: string;}} props
     */
    render({tabInfo, parent, tabIdx, className}) {
        const items = parent.state[tabInfo.groupName];
        return <div class={ className }>
            { items.length
                ? [
                    <InputGroup>
                        <label class="form-checkbox color-alt">
                            <input onChange={ e => this.props.parent.toggleAll(e, tabInfo.groupName) }
                                type="checkbox"
                                defaultChecked/>
                            <i class="form-icon"></i> (Kaikki)
                        </label>
                    </InputGroup>,
                    <div class="mb-8">{ items.map((s, i) =>
                        <InputGroup key={ i }>
                        <label class="form-checkbox">
                            <input onChange={ e => this.props.parent.toggleIsSelected(s, e, tabInfo.groupName) }
                                value={ s.selected }
                                type="checkbox"
                                checked={ s.selected }/>
                            <i class="form-icon"></i> { s.value }
                        </label>
                        </InputGroup>
                    ) }</div>
                ]
                : <div class="mb-8">{ !tabInfo.dataFetched ? 'Ladataan' : `${tabInfo.noItemsLabel} ei löytynyt` }.</div>
            }
            { tabIdx > 0
                ? <button onClick={ () => this.props.parent.goBack(tabIdx - 1) } class="btn btn-link"
                        type="button">&lt; Edellinen</button>
                : null }
            <button onClick={ () => this.props.parent.next(tabIdx) } class="btn btn-link"
                    type="submit">Seuraava &gt;</button>
        </div>;
    }
}

// https://stackoverflow.com/a/44678459
function genRandomString(len) {
    const p = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
    return [...Array(len)].reduce(a=>a+p[~~(Math.random()*p.length)],'');
}

export default WebsitePackView;
export {genRandomString};
