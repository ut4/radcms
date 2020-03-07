import {http, toasters, Form, Toaster, InputGroup, Input, FeatherSvg} from '@rad-commons';

class InstallApp extends preact.Component {
    /**
     * @param {{siteDirPath: string;}} props
     */
    constructor(props) {
        super(props);
        const l = sessionStorage.lastTyped;
        this.state = !l ? {
            siteName: 'My site',
            siteLang: 'fi_FI',
            sampleContent: 'minimal',
            mainQueryVar: '',
            useDevMode: false,
            //
            dbHost: '127.0.0.1',
            dbDatabase: 'rad',
            dbUser: 'username',
            dbPass: '',
            dbTablePrefix: 'rad_',
            dbCharset: 'utf8',
            //
            firstUserName: 'my-name',
            firstUserEmail: 'my@mail.com',
            firstUserPass: '',
            //
            tabs: [{isCurrent: true, isOk: false},
                   {isCurrent: false, isOk: false},
                   {isCurrent: false, isOk: false}],
        } : JSON.parse(l);
    }
    /**
     * @access protected
     */
    render() {
        return <div>
            <Toaster autoCloseTimeoutMillis={ 60000 } id="main"/>
            <div>
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
                <form onSubmit={ e => this.handleSubmit(0, e) }>
                    <InputGroup label={ () => <span data-help-text="Sivustoprojektin nimi, ei pakollinen.">Sivuston nimi</span> }>
                        <input name="siteName" id="siteName" onChange={ e => Form.receiveInputValue(e, this) }
                               value={ this.state.siteName}/>
                    </InputGroup>
                    <InputGroup label={ () => <span data-help-text="Sisältö, jolla sivusto alustetaan.">Esimerkkisisältö</span> }>
                        <select name="sampleContent" id="sampleContent"
                                value={ this.state.sampleContent }
                                onChange={ e => Form.receiveInputValue(e, this) }>
                            { [{name: 'minimal', friendlyName: 'Minimaalinen'},
                               {name: 'blog', friendlyName: 'Blogi'}].map(opt =>
                                <option value={ opt.name }>{ opt.friendlyName }</option>
                            ) }
                        </select>
                    </InputGroup>
                    <div class="fieldset">
                        <div class="legend">Lisäasetukset</div>
                        <InputGroup label={ () => <span data-help-text="Url-parametri (index.php?parametrinNimi=/) mikäli url-rewrite -säännöt ei ole käytössä.">Url-parametri</span> }>
                            <input name="mainQueryVar" id="mainQueryVar" onChange={ e => Form.receiveInputValue(e, this) }
                                   value={ this.state.mainQueryVar}/>
                        </InputGroup>
                        <InputGroup inline="true" label={ () => <span data-help-text="Ruksaa mikäli sivusto on vielä kehitysvaiheessa.">Käytä dev-modea</span> }>
                            <input type="checkbox" id="devMode" onChange={ e => this.setState({useDevMode: e.target.checked}) }
                                   value={ this.state.useDevMode}/>
                        </InputGroup>
                    </div>
                    <br/>
                    <button class="text-button"
                            type="submit">Seuraava &gt;</button>
                </form>
                </div>
                <div class={ this.state.tabs[1].isCurrent ? '' : 'hidden' }>
                <form onSubmit={ e => this.handleSubmit(1, e) }>
                    <InputGroup label={ () => <span data-help-text="Tietokantaserverin osoite (host).">Tietokannan osoite</span> }>
                        <Input name="dbHost" id="dbHost" onChange={ e => Form.receiveInputValue(e, this) }
                               value={ this.state.dbHost }
                               required/>
                    </InputGroup>
                    <InputGroup label={ () => <span data-help-text="Tietokantakäyttäjän nimi, jota RadCMS käyttää luodessaan tietokantayhteyden.">Tietokantakäyttäjä</span> }>
                        <Input name="dbUser" id="dbUser" onChange={ e => Form.receiveInputValue(e, this) }
                               value={ this.state.dbUser }
                               required/>
                    </InputGroup>
                    <InputGroup label={ () => <span data-help-text="Tietokantakäyttäjän salasana, jota RadCMS käyttää luodessaan tietokantayhteyden.">Tietokantakäyttäjän salasana</span> }>
                        <Input name="dbPass" id="dbPass" onChange={ e => Form.receiveInputValue(e, this) }
                               value={ this.state.dbPass } type="password"/>
                    </InputGroup>
                    <InputGroup label={ () => <span data-help-text="Luotavan RadCMS-tietokannan nimi.">Tietokannan nimi</span> }>
                        <Input name="dbDatabase" id="dbDatabase" onChange={ e => Form.receiveInputValue(e, this) }
                               value={ this.state.dbDatabase }
                               required/>
                    </InputGroup>
                    <div class="fieldset">
                        <div class="legend">Lisäasetukset</div>
                        <InputGroup label={ () => <span data-help-text="Prefix, jota käytetään RadCMS:n tietokantataulujen etuliitteenä.">Tietokantataulujen prefix</span> }>
                            <input name="dbTablePrefix" id="dbTablePrefix" onChange={ e => Form.receiveInputValue(e, this) }
                                   value={ this.state.dbTablePrefix }/>
                        </InputGroup>
                        <InputGroup label="Tietokannan charset">
                            <select name="dbCharset" id="dbCharset"
                                    onChange={ e => Form.receiveInputValue(e, this) }
                                    value={ this.state.dbCharset }>
                                { ['utf8'].map(opt =>
                                    <option value={ opt }>{ opt }</option>
                                ) }
                            </select>
                        </InputGroup>
                    </div>
                    <br/>
                    <button onClick={ () => this.goBack(0) } class="text-button"
                            type="button">&lt; Edellinen</button>
                    <span> </span>
                    <button class="text-button"
                            type="submit">Seuraava &gt;</button>
                </form>
                </div>
                <div class={ this.state.tabs[2].isCurrent ? '' : 'hidden' }>
                <form onSubmit={ e => this.handleSubmit(2, e) }>
                    <InputGroup label="Käyttäjä">
                        <Input name="firstUserName" id="firstUserName"
                               onChange={ e => Form.receiveInputValue(e, this) }
                               value={ this.state.firstUserName }
                               required/>
                    </InputGroup>
                    <InputGroup label="E-mail">
                        <Input name="firstUserEmail" id="firstUserEmail"
                               onChange={ e => Form.receiveInputValue(e, this) }
                               value={ this.state.firstUserEmail }
                               required/>
                    </InputGroup>
                    <InputGroup label="Salasana">
                        <Input name="firstUserPass" id="firstUserPass" type="password"
                               onChange={ e => Form.receiveInputValue(e, this) }
                               value={ this.state.firstUserPass }
                               required/>
                    </InputGroup>
                    <br/>
                    <button onClick={ () => this.goBack(1) } class="text-button"
                            type="button">&lt; Edellinen</button>
                    <span> </span>
                    <button class="nice-button primary"
                            type="submit">Asenna</button>
                </form>
                </div>
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
    handleSubmit(tabIdx, e) {
        e.preventDefault();
        if (!e.target.reportValidity())
            return;
        if (tabIdx < 2) {
            const tabs = this.state.tabs;
            tabs[tabIdx] = {isCurrent: false, isOk: true};
            tabs[tabIdx + 1].isCurrent = true;
            this.setState({tabs});
            return;
        }
        const data = Object.assign({}, this.state);
        delete data.tabs;
        sessionStorage.lastTyped = JSON.stringify(data);
        data.baseUrl = location.pathname.replace('install.php', '');
        const makeUrl = url => data.baseUrl + (!this.state.mainQueryVar
            ? url
            : `index.php?${this.state.mainQueryVar}=/${url}`);
        http.post('', data)
            .then(() => {
                toasters.main(() => <p>Sivusto asennettiin kansioon <span style="font-weight: bold">{ this.props.siteDirPath }</span>. Aloita lukemalla README.md, siirry <a href={ makeUrl('') }>sivustolle</a>, tai hallintanäkymän <a href={ makeUrl('login') }>kirjautumissivulle</a>.</p>, 'success');
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

export default InstallApp;
