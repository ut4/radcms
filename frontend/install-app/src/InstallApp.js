import {services, components} from '../../rad-commons.js';
const {Form, Toaster} = components;
const $el = preact.createElement;

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
        return $el('div', null,
            $el(Toaster, {autoCloseTimeoutMillis: 60000}),
            $el(Form, {onConfirm: e => this.handleSubmit(e), confirmButtonText: 'Asenna', autoClose: false},
                $el('h2', null, 'Asenna RadCMS'),
                $el('div', {className: 'box'},
                    $el('label', null,
                        $el('span', {'data-help-text': 'Sivustoprojektin nimi, ei pakollinen.'}, 'Sivuston nimi'),
                        $el('input', {name: 'siteName', onChange: e => Form.receiveInputValue(e, this),
                                      value: this.state.siteName})
                    ),
                    $el('label', null,
                        $el('span', {'data-help-text': 'Sisältö, jolla sivusto alustetaan.'}, 'Esimerkkisisältö'),
                        $el('select', {name: 'sampleContent',
                                       value: this.state.sampleContent,
                                       onChange: e => Form.receiveInputValue(e, this)},
                            [{name: 'minimal', friendlyName: 'Minimaalinen'},
                             {name: 'blog', friendlyName: 'Blogi'}].map(opt =>
                                $el('option', {value: opt.name}, opt.friendlyName)
                            ))
                    ),
                    $el('div', {className: 'fieldset'},
                        $el('div', {className: 'legend'}, 'Lisäasetukset'),
                        $el('label', null,
                            $el('span', {'data-help-text': 'Url-parametri (index.php?parametrinNimi=/) mikäli url-rewrite -säännöt ei ole käytössä.'}, 'Url-parametri'),
                            $el('input', {name: 'mainQueryVar', onChange: e => Form.receiveInputValue(e, this),
                                          value: this.state.mainQueryVar})
                        ),
                        $el('label', null,
                            $el('input', {type: 'checkbox', onChange: e => this.setState({useDevMode: e.target.checked}),
                                          value: this.state.useDevMode}),
                            $el('span', {'data-help-text': 'Ruksaa mikäli sivusto on vielä kehitysvaiheessa.'}, 'Käytä dev-modea')
                        )
                    )
                ),
                $el('div', {className: 'view-content box'},
                    $el('label', null,
                        $el('span', {'data-help-text': 'Tietokantaserverin osoite (host).'}, 'Tietokannan osoite'),
                        $el('input', {name: 'dbHost', onChange: e => Form.receiveInputValue(e, this),
                                      value: this.state.dbHost})
                    ),
                    $el('label', null,
                        $el('span', {'data-help-text': 'Tietokantakäyttäjän nimi, jota RadCMS käyttää luodessaan tietokantayhteyden.'}, 'Tietokantakäyttäjä'),
                        $el('input', {name: 'dbUser', onChange: e => Form.receiveInputValue(e, this),
                                      value: this.state.dbUser})
                    ),
                    $el('label', null,
                        $el('span', {'data-help-text': 'Tietokantakäyttäjän salasana, jota RadCMS käyttää luodessaan tietokantayhteyden.'}, 'Tietokantakäyttäjän salasana'),
                        $el('input', {name: 'dbPass', onChange: e => Form.receiveInputValue(e, this),
                                      value: this.state.dbPass,
                                      type: 'password'})
                    ),
                    $el('label', null,
                        $el('span', {'data-help-text': 'Luotavan RadCMS-tietokannan nimi.'}, 'Tietokannan nimi'),
                        $el('input', {name: 'dbDatabase', onChange: e => Form.receiveInputValue(e, this),
                                      value: this.state.dbDatabase})
                    ),
                    $el('div', {className: 'fieldset'},
                        $el('div', {className: 'legend'}, 'Lisäasetukset'),
                        $el('label', null,
                            $el('span', {'data-help-text': 'Prefix, jota käytetään RadCMS:n tietokantataulujen etuliitteenä.'}, 'Tietokantataulujen prefix'),
                            $el('input', {name: 'dbTablePrefix', onChange: e => Form.receiveInputValue(e, this),
                                          value: this.state.dbTablePrefix})
                        ),
                        $el('label', null,
                            $el('span', {'data-help-text': '.'}, 'Tietokannan charset'),
                            $el('select', {name: 'dbCharset',
                                           value: this.state.dbCharset,
                                           onClick: e => Form.receiveInputValue(e, this)},
                                ['utf8'].map(opt =>
                                    $el('option', {value: opt}, opt)
                                ))
                        )
                    )
                ),
                $el('div', {className: 'view-content box'},
                    $el('label', null,
                        $el('span', {'data-help-text': '.'}, 'Käyttäjä'),
                        $el('input', {name: 'firstUserName', onChange: e => Form.receiveInputValue(e, this),
                                      value: this.state.firstUserName})
                    ),
                    $el('label', null,
                        $el('span', {'data-help-text': '.'}, 'Salasana'),
                        $el('input', {name: 'firstUserPass', type: 'password',
                                      onChange: e => Form.receiveInputValue(e, this),
                                      value: this.state.firstUserPass})
                    )
                )
            )
        );
    }
    /**
     * @access private
     */
    handleSubmit() {
        const data = this.state;
        sessionStorage.lastTyped = JSON.stringify(data);
        data.baseUrl = location.pathname.replace('install.php', '');
        services.http.post('', data)
        .then(() => {
            toast($el('p', null,
                'Sivusto asennettiin kansioon ', $el('span', {style: 'font-weight: bold'}, this.props.siteDirPath), '. Aloita lukemalla README.md, tai ',
                $el('a', {href: data.baseUrl + (!this.state.mainQueryVar ? '' : 'index.php?' + this.state.mainQueryVar + '=/')}, 'siirry'),
                ' sivustolle.'
            ), 'success');
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
