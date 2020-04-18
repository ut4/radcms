import {http, toasters, InputGroup2, Input2, Select2, InputError2, FeatherSvg, hookForm} from '@rad-commons';

class WizardInstallerView extends preact.Component {
    /**
     * @param {{siteDirPath: string; baseUrl: string;}} props
     */
    constructor(props) {
        super(props);
        const l = sessionStorage.lastTyped;
        this.lastTyped = l ? JSON.parse(l) : {};
        this.state = {tabs: [{isCurrent: true, isOk: false},
                             {isCurrent: false, isOk: false},
                             {isCurrent: false, isOk: false}]};
        this.tabRefs = [preact.createRef(),
                        preact.createRef(),
                        preact.createRef()];
    }
    /**
     * @access protected
     */
    render() {
        return <div>
            <h2>Asenna RadCMS</h2>
            <nav class="step-indicators">
                <div class={ this.state.tabs[0].isCurrent ? 'current' : '' +
                                (this.state.tabs[0].isOk ? ' checked' : '' ) }>Sivusto
                                <FeatherSvg iconId="check"/></div>
                <div class={ this.state.tabs[1].isCurrent ? 'current' : '' +
                                (this.state.tabs[1].isOk ? ' checked' : '' ) }>Tietokanta
                                <FeatherSvg iconId="check"/></div>
                <div class={ this.state.tabs[2].isCurrent ? 'current' : '' +
                                (this.state.tabs[2].isOk ? ' checked' : '' ) }>Käyttäjä
                                <FeatherSvg iconId="check"/></div>
            </nav>
            <div class={ this.state.tabs[0].isCurrent ? '' : 'hidden' }>
                <SiteSettingsTab parent={ this } ref={ this.tabRefs[0] }/>
            </div>
            <div class={ this.state.tabs[1].isCurrent ? '' : 'hidden' }>
                <DatabaseSettingsTab parent={ this } ref={ this.tabRefs[1] }/>
            </div>
            <div class={ this.state.tabs[2].isCurrent ? '' : 'hidden' }>
                <UserSettingsTab parent={ this } ref={ this.tabRefs[2] }/>
            </div>
        </div>;
    }
    /**
     * @access private
     */
    goBack(toIdx) {
        const tabs = this.state.tabs;
        tabs[toIdx] = {isOk: false, isCurrent: true};
        tabs[toIdx+1] = {isOk: false, isCurrent: false};
        this.setState(tabs);
    }
    /**
     * @access private
     */
    handleSubmit(e, tabIdx) {
        if (!this.tabRefs[tabIdx].current.getForm().handleSubmit(e))
            return;
        if (tabIdx < 2) {
            const tabs = this.state.tabs;
            tabs[tabIdx] = {isCurrent: false, isOk: true};
            tabs[tabIdx + 1].isCurrent = true;
            this.setState({tabs});
            return;
        }
        const data = Object.assign({},
            this.tabRefs[0].current.getValues(),
            this.tabRefs[1].current.getValues(),
            this.tabRefs[2].current.getValues()
        );
        sessionStorage.lastTyped = JSON.stringify(Object.assign({}, data, {
            dbPass: '',
            firstUserPass: '',
        }));
        data.baseUrl = this.props.baseUrl;
        const makeUrl = url => data.baseUrl + (!this.state.mainQueryVar
            ? url
            : `index.php?${this.state.mainQueryVar}=/${url}`);
        http.post('', data)
            .then(() => {
                toasters.main(() => <p>Sivusto asennettiin kansioon <span style="font-weight: bold">{ this.props.siteDirPath }</span>. Aloita lukemalla theme/README.md, siirry <a href={ makeUrl('') }>sivustolle</a>, tai hallintanäkymän <a href={ makeUrl('login') }>kirjautumissivulle</a>.</p>, 'success');
                const tabs = this.state.tabs;
                tabs[2].isOk = true;
                this.setState({tabs});
                window.scrollTo(0, 0);
            })
            .catch(err => {
                console.error(err);
                toasters.main('Asennus epäonnistui', 'error');
                window.scrollTo(0, 0);
            });
    }
}

class Tab extends preact.Component {
    /**
     * @access public
     */
    getValues() {
        return this.state.values;
    }
    /**
     * @access public
     */
    getForm() {
        return this.form;
    }
    /**
     * @access protected
     */
    render() {
        throw new Error('Abstract method not implemented.');
    }
}

class SiteSettingsTab extends Tab {
    /**
     * @param {any} props
     */
    constructor(props) {
        super(props);
        const prev = props.parent.lastTyped;
        this.state = hookForm(this, {
            siteName: prev.siteName || 'My site',
            siteLang: prev.siteLang || 'fi',
            sampleContent: prev.sampleContent || 'minimal',
            mainQueryVar: prev.mainQueryVar || '',
            useDevMode: prev.useDevMode || false,
        });
    }
    /**
     * @access protected
     */
    render() {
        const {classes} = this.state;
        return <form onSubmit={ e => this.props.parent.handleSubmit(e, 0) }>
            <InputGroup2 classes={ classes.siteName }>
                <label htmlFor="siteName" data-help-text="Sivustoprojektin nimi, ei pakollinen.">Sivuston nimi</label>
                <Input2 vm={ this } name="siteName" id="siteName"/>
            </InputGroup2>
            <InputGroup2 classes={ classes.sampleContent }>
                <label htmlFor="sampleContent" data-help-text="Sisältö, jolla sivusto alustetaan.">Esimerkkisisältö</label>
                <Select2 vm={ this } name="sampleContent" id="sampleContent">
                    { [{name: 'minimal', friendlyName: 'Minimaalinen'},
                        {name: 'blog', friendlyName: 'Blogi'}].map(opt =>
                        <option value={ opt.name }>{ opt.friendlyName }</option>
                    ) }
                </Select2>
            </InputGroup2>
            <div class="fieldset">
                <div class="legend">Lisäasetukset</div>
                <InputGroup2 classes={ classes.mainQueryVar }>
                    <label htmlFor="mainQueryVar" data-help-text="Url-parametri (index.php?parametrinNimi=/) mikäli url-rewrite -säännöt ei ole käytössä.">Url-parametri</label>
                    <Input2 vm={ this } name="mainQueryVar" id="mainQueryVar"/>
                </InputGroup2>
                <InputGroup2 classes={ classes.useDevMode } inline="true">
                    <label htmlFor="useDevMode" data-help-text="Ruksaa mikäli sivusto on vielä kehitysvaiheessa.">Käytä dev-modea</label>
                    <Input2 vm={ this } type="checkbox" name="useDevMode" id="useDevMode" defaultChecked={ this.state.values.useDevMode }/>
                </InputGroup2>
            </div>
            <br/>
            <button class="text-button"
                    type="submit">Seuraava &gt;</button>
        </form>;
    }
}

class DatabaseSettingsTab extends Tab {
    /**
     * @param {any} props
     */
    constructor(props) {
        super(props);
        const prev = props.parent.lastTyped;
        this.state = hookForm(this, {
            dbHost: prev.dbHost || '127.0.0.1',
            dbDatabase: prev.dbDatabase || 'rad',
            dbUser: prev.dbUser || 'username',
            dbPass: prev.dbPass || '',
            dbTablePrefix: prev.dbTablePrefix || 'rad_',
            dbCharset: prev.dbCharset || 'utf8',
            doCreateDb: prev.doCreateDb || false,
        });
    }
    /**
     * @access protected
     */
    render() {
        const {errors, classes} = this.state;
        return <form onSubmit={ e => this.props.parent.handleSubmit(e, 1) }>
            <InputGroup2 classes={ classes.dbHost }>
                <label htmlFor="dbHost" data-help-text="Tietokantaserverin osoite (host).">Tietokannan osoite</label>
                <Input2 vm={ this } name="dbHost" id="dbHost"
                        validations={ [['required']] }
                        errorLabel="Tietokannan osoite"/>
                <InputError2 error={ errors.dbHost }/>
            </InputGroup2>
            <InputGroup2 classes={ classes.dbUser }>
                <label htmlFor="dbUser" data-help-text="Tietokantakäyttäjän nimi, jota RadCMS käyttää luodessaan tietokantayhteyden.">Tietokantakäyttäjä</label>
                <Input2 vm={ this } name="dbUser" id="dbUser"
                        validations={ [['required']] }
                        errorLabel="Tietokantakäyttäjä"/>
                <InputError2 error={ errors.dbUser }/>
            </InputGroup2>
            <InputGroup2 classes={ classes.dbPass }>
                <label htmlFor="dbPass" data-help-text="Tietokantakäyttäjän salasana, jota RadCMS käyttää luodessaan tietokantayhteyden.">Tietokantakäyttäjän salasana</label>
                <Input2 vm={ this } name="dbPass" id="dbPass" type="password"/>
            </InputGroup2>
            <div class="grouped">
            <InputGroup2 classes={ classes.dbDatabase }>
                <label htmlFor="dbDatabase" data-help-text="Käytettävän, tai luotavan RadCMS-tietokannan nimi.">Tietokannan nimi</label>
                <Input2 vm={ this } name="dbDatabase" id="dbDatabase"
                        validations={ [['required']] }
                        errorLabel="Tietokannan nimi"/>
                <InputError2 error={ errors.dbDatabase }/>
            </InputGroup2>
            <InputGroup2 classes={ classes.doCreateDb }>
                <label htmlFor="doCreateDb" data-help-text="Luo tietokanta mikäli sitä ei ole vielä olemassa.">Luo tietokanta</label>
                <Input2 vm={ this } type="checkbox" id="doCreateDb" name="doCreateDb" defaultChecked={ this.state.values.doCreateDb }/>
            </InputGroup2>
            </div>
            <div class="fieldset">
                <div class="legend">Lisäasetukset</div>
                <InputGroup2 classes={ classes.dbTablePrefix }>
                    <label htmlFor="dbTablePrefix" data-help-text="Prefix, jota käytetään RadCMS:n tietokantataulujen etuliitteenä.">Tietokantataulujen prefix</label>
                    <Input2 vm={ this } name="dbTablePrefix" id="dbTablePrefix"/>
                </InputGroup2>
                <InputGroup2 classes={ classes.dbCharset }>
                    <label htmlFor="dbCharset">Tietokannan charset</label>
                    <Select2 vm={ this } name="dbCharset" id="dbCharset">
                        { ['utf8'].map(opt =>
                            <option value={ opt }>{ opt }</option>
                        ) }
                    </Select2>
                </InputGroup2>
            </div>
            <br/>
            <button onClick={ () => this.props.parent.goBack(0) } class="text-button"
                    type="button">&lt; Edellinen</button>
            <span> </span>
            <button class="text-button"
                    type="submit">Seuraava &gt;</button>
        </form>;
    }
}

class UserSettingsTab extends Tab {
    /**
     * @param {any} props
     */
    constructor(props) {
        super(props);
        const prev = props.parent.lastTyped;
        this.state = hookForm(this, {
            firstUserName: prev.firstUserName || 'my-name',
            firstUserEmail: prev.firstUserEmail || 'my@mail.com',
            firstUserPass: prev.firstUserPass || '',
        });
    }
    /**
     * @access protected
     */
    render() {
        const {errors, classes} = this.state;
        return <form onSubmit={ e => this.props.parent.handleSubmit(e, 2) }>
            <InputGroup2 classes={ classes.firstUserName }>
                <label htmlFor="firstUserName">Käyttäjä</label>
                <Input2 vm={ this } name="firstUserName" id="firstUserName"
                        errorLabel="Käyttäjä"
                        validations={ [['required']] }/>
                <InputError2 error={ errors.firstUserName }/>
            </InputGroup2>
            <InputGroup2 classes={ classes.firstUserEmail }>
                <label htmlFor="firstUserEmail">E-mail</label>
                <Input2 vm={ this } name="firstUserEmail" id="firstUserEmail"
                        errorLabel="E-mail"
                        validations={ [['required']] }/>
                <InputError2 error={ errors.firstUserName }/>
            </InputGroup2>
            <InputGroup2 classes={ classes.firstUserPass }>
                <label htmlFor="firstUserPass">Salasana</label>
                <Input2 vm={ this } name="firstUserPass" id="firstUserPass" type="password"
                        errorLabel="Salasana"
                        validations={ [['required']] }/>
                <InputError2 error={ errors.firstUserPass }/>
            </InputGroup2>
            <br/>
            <button onClick={ () => this.props.parent.goBack(1) } class="text-button"
                    type="button">&lt; Edellinen</button>
            <span> </span>
            <button class="nice-button primary"
                    type="submit">Asenna</button>
        </form>;
    }
}


export default WizardInstallerView;
