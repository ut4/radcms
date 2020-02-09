import {http, Form, Toaster, InputGroup} from '@rad-commons';

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
            firstUserPass: '',
        } : JSON.parse(l);
    }
    /**
     * @access protected
     */
    render() {
        return <div>
            <Toaster autoCloseTimeoutMillis={ 60000 }/>
            <Form onConfirm={ () => this.handleSubmit() } confirmButtonText="Asenna" autoClose={ false }>
                <h2>Asenna RadCMS</h2>
                <div class="box">
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
                </div>
                <div class="view-content box">
                    <InputGroup label={ () => <span data-help-text="Tietokantaserverin osoite (host).">Tietokannan osoite</span> }>
                        <input name="dbHost" id="dbHost" onChange={ e => Form.receiveInputValue(e, this) }
                               value={ this.state.dbHost }/>
                    </InputGroup>
                    <InputGroup label={ () => <span data-help-text="Tietokantakäyttäjän nimi, jota RadCMS käyttää luodessaan tietokantayhteyden.">Tietokantakäyttäjä</span> }>
                        <input name="dbUser" id="dbUser" onChange={ e => Form.receiveInputValue(e, this) }
                               value={ this.state.dbUser }/>
                    </InputGroup>
                    <InputGroup label={ () => <span data-help-text="Tietokantakäyttäjän salasana, jota RadCMS käyttää luodessaan tietokantayhteyden.">Tietokantakäyttäjän salasana</span> }>
                        <input name="dbPass" id="dbPass" onChange={ e => Form.receiveInputValue(e, this) }
                               value={ this.state.dbPass } type="password"/>
                    </InputGroup>
                    <InputGroup label={ () => <span data-help-text="Luotavan RadCMS-tietokannan nimi.">Tietokannan nimi</span> }>
                        <input name="dbDatabase" id="dbDatabase" onChange={ e => Form.receiveInputValue(e, this) }
                               value={ this.state.dbDatabase }/>
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
                </div>
                <div class="view-content box">
                    <InputGroup label="Käyttäjä">
                        <input name="firstUserName" id="firstUserName" onChange={ e => Form.receiveInputValue(e, this) }
                               value={ this.state.firstUserName }/>
                    </InputGroup>
                    <InputGroup label="Salasana">
                        <input name="firstUserPass" id="firstUserPass" type="password"
                               onChange={ e => Form.receiveInputValue(e, this) }
                               value={ this.state.firstUserPass }/>
                    </InputGroup>
                </div>
            </Form>
        </div>;
    }
    /**
     * @access private
     */
    handleSubmit() {
        const data = this.state;
        sessionStorage.lastTyped = JSON.stringify(data);
        data.baseUrl = location.pathname.replace('install.php', '');
        http.post('', data)
            .then(() => {
                toast(() => <p>Sivusto asennettiin kansioon <span style="font-weight: bold">{ this.props.siteDirPath }</span>. Aloita lukemalla README.md, tai <a href={ data.baseUrl + (!this.state.mainQueryVar ? '' : 'index.php?' + this.state.mainQueryVar + '=/') }>siirry</a> sivustolle.</p>, 'success');
                window.scrollTo(0, 0);
            })
            .catch(err => {
                console.error(err);
                toast('Asennus epäonnistui', 'error');
                window.scrollTo(0, 0);
            });
    }
}

export default InstallApp;
