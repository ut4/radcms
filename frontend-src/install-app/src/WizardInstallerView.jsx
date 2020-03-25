import {http, toasters, Form, InputGroup, Input, InputErrors, FeatherSvg} from '@rad-commons';

class WizardInstallerView extends preact.Component {
    /**
     * @param {{siteDirPath: string; baseUrl: string;}} props
     */
    constructor(props) {
        super(props);
        const l = sessionStorage.lastTyped;
        this.state = Object.assign({}, !l ? {
            siteName: 'My site',
            siteLang: 'fi',
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
            doCreateDb: false,
            //
            firstUserName: 'my-name',
            firstUserEmail: 'my@mail.com',
            firstUserPass: '',
        } : JSON.parse(l), {
            tabs: [{isCurrent: true, isOk: false},
                   {isCurrent: false, isOk: false},
                   {isCurrent: false, isOk: false}]
        });
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
            <Form onSubmit={ () => this.handleSubmit(0) } formId="a" omitButtons>
                <InputGroup>
                    <label htmlFor="siteName" data-help-text="Sivustoprojektin nimi, ei pakollinen.">Sivuston nimi</label>
                    <Input name="siteName" id="siteName" onInput={ e => Form.receiveInputValue(e, this) }
                            value={ this.state.siteName} formId="a"/>
                </InputGroup>
                <InputGroup>
                    <label htmlFor="sampleContent" data-help-text="Sisältö, jolla sivusto alustetaan.">Esimerkkisisältö</label>
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
                    <InputGroup>
                        <label htmlFor="mainQueryVar" data-help-text="Url-parametri (index.php?parametrinNimi=/) mikäli url-rewrite -säännöt ei ole käytössä.">Url-parametri</label>
                        <Input name="mainQueryVar" id="mainQueryVar" onInput={ e => Form.receiveInputValue(e, this) }
                                value={ this.state.mainQueryVar} formId="a"/>
                    </InputGroup>
                    <InputGroup inline="true">
                        <label htmlFor="devMode" data-help-text="Ruksaa mikäli sivusto on vielä kehitysvaiheessa.">Käytä dev-modea</label>
                        <Input type="checkbox" id="devMode" onInput={ e => this.setState({useDevMode: e.target.checked}) }
                                value={ this.state.useDevMode}
                                defaultChecked={ this.state.useDevMode } formId="a"/>
                    </InputGroup>
                </div>
                <br/>
                <button class="text-button"
                        type="submit">Seuraava &gt;</button>
            </Form>
            </div>
            <div class={ this.state.tabs[1].isCurrent ? '' : 'hidden' }>
            <Form onSubmit={ () => this.handleSubmit(1) } formId="b" omitButtons>
                <InputGroup>
                    <label htmlFor="dbHost" data-help-text="Tietokantaserverin osoite (host).">Tietokannan osoite</label>
                    <Input name="dbHost" id="dbHost" onInput={ e => Form.receiveInputValue(e, this) }
                            value={ this.state.dbHost }
                            validations={ [['required']] }
                            validationLabel="Tietokannan osoite"
                            formId="b"/>
                    <InputErrors/>
                </InputGroup>
                <InputGroup>
                    <label htmlFor="dbUser" data-help-text="Tietokantakäyttäjän nimi, jota RadCMS käyttää luodessaan tietokantayhteyden.">Tietokantakäyttäjä</label>
                    <Input name="dbUser" id="dbUser" onInput={ e => Form.receiveInputValue(e, this) }
                            value={ this.state.dbUser }
                            validations={ [['required']] }
                            validationLabel="Tietokantakäyttäjä"
                            formId="b"/>
                    <InputErrors/>
                </InputGroup>
                <InputGroup>
                    <label htmlFor="dbPass" data-help-text="Tietokantakäyttäjän salasana, jota RadCMS käyttää luodessaan tietokantayhteyden.">Tietokantakäyttäjän salasana</label>
                    <Input name="dbPass" id="dbPass" onInput={ e => Form.receiveInputValue(e, this) }
                            value={ this.state.dbPass } type="password"
                            formId="b"/>
                </InputGroup>
                <div class="grouped">
                <InputGroup>
                    <label htmlFor="dbDatabase" data-help-text="Käytettävän, tai luotavan RadCMS-tietokannan nimi.">Tietokannan nimi</label>
                    <Input name="dbDatabase" id="dbDatabase" onInput={ e => Form.receiveInputValue(e, this) }
                            value={ this.state.dbDatabase }
                            validations={ [['required']] }
                            validationLabel="Tietokannan nimi"
                            formId="b"/>
                    <InputErrors/>
                </InputGroup>
                <InputGroup>
                    <label htmlFor="doCreateDb" data-help-text="Luo tietokanta mikäli sitä ei ole vielä olemassa.">Luo tietokanta</label>
                    <Input type="checkbox" id="doCreateDb" onInput={ e => this.setState({doCreateDb: e.target.checked}) }
                            value={ this.state.doCreateDb}
                            defaultChecked={ this.state.doCreateDb }
                            formId="b"/>
                </InputGroup>
                </div>
                <div class="fieldset">
                    <div class="legend">Lisäasetukset</div>
                    <InputGroup>
                        <label htmlFor="dbTablePrefix" data-help-text="Prefix, jota käytetään RadCMS:n tietokantataulujen etuliitteenä.">Tietokantataulujen prefix</label>
                        <Input name="dbTablePrefix" id="dbTablePrefix" onInput={ e => Form.receiveInputValue(e, this) }
                                value={ this.state.dbTablePrefix }
                                formId="b"/>
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
            </Form>
            </div>
            <div class={ this.state.tabs[2].isCurrent ? '' : 'hidden' }>
            <Form onSubmit={ () => this.handleSubmit(2) } formId="c" omitButtons>
                <InputGroup label="Käyttäjä">
                    <Input name="firstUserName" id="firstUserName"
                            onInput={ e => Form.receiveInputValue(e, this) }
                            value={ this.state.firstUserName }
                            validations={ [['required']] }
                            formId="c"/>
                    <InputErrors/>
                </InputGroup>
                <InputGroup label="E-mail">
                    <Input name="firstUserEmail" id="firstUserEmail"
                            onInput={ e => Form.receiveInputValue(e, this) }
                            value={ this.state.firstUserEmail }
                            validations={ [['required']] }
                            formId="c"/>
                    <InputErrors/>
                </InputGroup>
                <InputGroup label="Salasana">
                    <Input name="firstUserPass" id="firstUserPass" type="password"
                            onInput={ e => Form.receiveInputValue(e, this) }
                            value={ this.state.firstUserPass }
                            validations={ [['required']] }
                            formId="c"/>
                    <InputErrors/>
                </InputGroup>
                <br/>
                <button onClick={ () => this.goBack(1) } class="text-button"
                        type="button">&lt; Edellinen</button>
                <span> </span>
                <button class="nice-button primary"
                        type="submit">Asenna</button>
            </Form>
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
    handleSubmit(tabIdx) {
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
        data.baseUrl = this.props.baseUrl;
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

export default WizardInstallerView;
