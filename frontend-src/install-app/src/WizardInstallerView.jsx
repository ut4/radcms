import {http, toasters, InputGroup, Input, Select, InputError, FeatherSvg, hookForm} from '@rad-commons';

class WizardInstallerView extends preact.Component {
    /**
     * @param {{baseUrl: string;}} props
     */
    constructor(props) {
        super(props);
        const l = sessionStorage.lastTyped;
        this.lastTyped = l ? JSON.parse(l) : {};
        this.state = {tabs: [{isCurrent: true, isOk: false},
                             {isCurrent: false, isOk: false},
                             {isCurrent: false, isOk: false}],
                      installDetails: null};
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
            { this.state.installDetails
                ? <p class="info-box success">Sivusto asennettiin kansioon <span style="font-weight: bold">{ this.state.installDetails.siteWasInstalledTo }</span>. Aloita lukemalla site/README.md, siirry <a href={ this.props.makeUrl('', this.state.installDetails) }>sivustolle</a>, tai hallintanäkymän <a href={ this.props.makeUrl('login', this.state.installDetails) }>kirjautumissivulle</a>.</p>
                : null
            }
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
        const data = Object.assign(
            {baseUrl: this.props.baseUrl},
            this.tabRefs[0].current.getValues(),
            this.tabRefs[1].current.getValues(),
            this.tabRefs[2].current.getValues(),
        );
        sessionStorage.lastTyped = JSON.stringify(Object.assign({}, data, {
            dbPass: '',
            firstUserPass: '',
        }));
        http.post('', data)
            .then(details => {
                const tabs = this.state.tabs;
                tabs[2].isOk = true;
                this.setState({tabs, installDetails: {siteWasInstalledTo: details.siteWasInstalledTo,
                                                      mainQueryVar: data.mainQueryVar}});
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
            <InputGroup classes={ classes.siteName }>
                <label htmlFor="siteName" data-help-text="Sivustoprojektin nimi, ei pakollinen.">Sivuston nimi</label>
                <Input vm={ this } name="siteName" id="siteName"/>
            </InputGroup>
            <InputGroup classes={ classes.sampleContent }>
                <label htmlFor="sampleContent" data-help-text="Sisältö, jolla sivusto alustetaan.">Esimerkkisisältö</label>
                <Select vm={ this } name="sampleContent" id="sampleContent">
                    { [{name: 'minimal', friendlyName: 'Minimaalinen'},
                       {name: 'blog', friendlyName: 'Blogi'},
                       {name: 'basic-site', friendlyName: 'Perussivusto'}].map(opt =>
                        <option value={ opt.name }>{ opt.friendlyName }</option>
                    ) }
                </Select>
            </InputGroup>
            <div class="fieldset">
                <div class="legend">Lisäasetukset</div>
                <InputGroup classes={ classes.mainQueryVar }>
                    <label htmlFor="mainQueryVar" data-help-text="Url-parametri (index.php?parametrinNimi=/) mikäli url-rewrite -säännöt ei ole käytössä.">Url-parametri</label>
                    <Input vm={ this } name="mainQueryVar" id="mainQueryVar"/>
                </InputGroup>
                <InputGroup classes={ classes.useDevMode } inline="true">
                    <label htmlFor="useDevMode" data-help-text="Ruksaa mikäli sivusto on vielä kehitysvaiheessa.">Käytä dev-modea</label>
                    <Input vm={ this } type="checkbox" name="useDevMode" id="useDevMode" defaultChecked={ this.state.values.useDevMode }/>
                </InputGroup>
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
            <InputGroup classes={ classes.dbHost }>
                <label htmlFor="dbHost" data-help-text="Tietokantaserverin osoite (host).">Tietokannan osoite</label>
                <Input vm={ this } name="dbHost" id="dbHost"
                        validations={ [['required']] }
                        errorLabel="Tietokannan osoite"/>
                <InputError error={ errors.dbHost }/>
            </InputGroup>
            <InputGroup classes={ classes.dbUser }>
                <label htmlFor="dbUser" data-help-text="Tietokantakäyttäjän nimi, jota RadCMS käyttää luodessaan tietokantayhteyden.">Tietokantakäyttäjä</label>
                <Input vm={ this } name="dbUser" id="dbUser"
                        validations={ [['required']] }
                        errorLabel="Tietokantakäyttäjä"/>
                <InputError error={ errors.dbUser }/>
            </InputGroup>
            <InputGroup classes={ classes.dbPass }>
                <label htmlFor="dbPass" data-help-text="Tietokantakäyttäjän salasana, jota RadCMS käyttää luodessaan tietokantayhteyden.">Tietokantakäyttäjän salasana</label>
                <Input vm={ this } name="dbPass" id="dbPass" type="password"/>
            </InputGroup>
            <div class="grouped">
            <InputGroup classes={ classes.dbDatabase }>
                <label htmlFor="dbDatabase" data-help-text="Käytettävän, tai luotavan RadCMS-tietokannan nimi.">Tietokannan nimi</label>
                <Input vm={ this } name="dbDatabase" id="dbDatabase"
                        validations={ [['required']] }
                        errorLabel="Tietokannan nimi"/>
                <InputError error={ errors.dbDatabase }/>
            </InputGroup>
            <InputGroup classes={ classes.doCreateDb }>
                <label htmlFor="doCreateDb" data-help-text="Luo tietokanta mikäli sitä ei ole vielä olemassa.">Luo tietokanta</label>
                <Input vm={ this } type="checkbox" id="doCreateDb" name="doCreateDb" defaultChecked={ this.state.values.doCreateDb }/>
            </InputGroup>
            </div>
            <div class="fieldset">
                <div class="legend">Lisäasetukset</div>
                <InputGroup classes={ classes.dbTablePrefix }>
                    <label htmlFor="dbTablePrefix" data-help-text="Prefix, jota käytetään RadCMS:n tietokantataulujen etuliitteenä.">Tietokantataulujen prefix</label>
                    <Input vm={ this } name="dbTablePrefix" id="dbTablePrefix"/>
                </InputGroup>
                <InputGroup classes={ classes.dbCharset }>
                    <label htmlFor="dbCharset">Tietokannan charset</label>
                    <Select vm={ this } name="dbCharset" id="dbCharset">
                        { ['utf8'].map(opt =>
                            <option value={ opt }>{ opt }</option>
                        ) }
                    </Select>
                </InputGroup>
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
            <InputGroup classes={ classes.firstUserName }>
                <label htmlFor="firstUserName">Käyttäjä</label>
                <Input vm={ this } name="firstUserName" id="firstUserName"
                        errorLabel="Käyttäjä"
                        validations={ [['required']] }/>
                <InputError error={ errors.firstUserName }/>
            </InputGroup>
            <InputGroup classes={ classes.firstUserEmail }>
                <label htmlFor="firstUserEmail">E-mail</label>
                <Input vm={ this } name="firstUserEmail" id="firstUserEmail"
                        errorLabel="E-mail"
                        validations={ [['required']] }/>
                <InputError error={ errors.firstUserName }/>
            </InputGroup>
            <InputGroup classes={ classes.firstUserPass }>
                <label htmlFor="firstUserPass">Salasana</label>
                <Input vm={ this } name="firstUserPass" id="firstUserPass" type="password"
                        errorLabel="Salasana"
                        validations={ [['required']] }/>
                <InputError error={ errors.firstUserPass }/>
            </InputGroup>
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
