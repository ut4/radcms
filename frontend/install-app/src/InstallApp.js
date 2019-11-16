import {Form, Toaster} from '../../src/common-components.js';
import services from '../../src/common-services.js';
const $el = preact.createElement;

class InstallApp extends preact.Component {
    /**
     * @param {{indexFilePath: string;}} props
     */
    constructor(props) {
        super(props);
        const l = sessionStorage.lastTyped;
        this.indexFilePath = props.indexFilePath;
        const pcs = this.indexFilePath.split('/');
        const indedDirParent = pcs.slice(0, pcs.length - 2).join('/') + '/';
        this.state = !l ? {
            siteName: 'My site',
            baseUrl: '/',
            radPath: indedDirParent + 'backend/',
            sitePath: indedDirParent + 'my-site/',
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
        } : JSON.parse(l);
    }
    /**
     * @access protected
     */
    render() {
        return $el('div', null,
            $el(Toaster),
            $el(Form, {onConfirm: e => this.handleSubmit(e), confirmButtonText: 'Asenna', noAutoClose: true},
                $el('h2', null, 'Asenna RadCMS'),
                $el('div', {className: 'box'},
                    $el('label', null,
                        $el('span', {'data-help-text': 'Sivustoprojektin nimi, ei pakollinen.'}, 'Sivuston nimi'),
                        $el('input', {name: 'siteName', onChange: e => Form.receiveInputValue(e, this),
                                      value: this.state.siteName})
                    ),
                    $el('label', null,
                        $el('span', {'data-help-text': 'Sivuston baseUrl: "/" mikäli sivusto sijaitsee "/<public_html>" -kansion juuressa, tai esim. "/kansio/" mikäli se sijaitsee "/<public_html>/kansio/" -kansiossa.'}, 'Baseurl'),
                        $el('input', {name: 'baseUrl', onChange: e => Form.receiveInputValue(e, this),
                                      value: this.state.baseUrl})
                    ),
                    $el('label', null,
                        $el('span', {'data-help-text': 'RadCMS lähdekoodin absoluuttinen sijainti serverillä.'}, 'RadCMS-backendin sijainti'),
                        $el('input', {name: 'radPath', onChange: e => Form.receiveInputValue(e, this),
                                      value: this.state.radPath})
                    ),
                    $el('label', null,
                        $el('span', {'data-help-text': 'Sivuston omien tiedostojen absoluuttinen sijainti serverillä.'}, 'Sivuston sijainti'),
                        $el('input', {name: 'sitePath', onChange: e => Form.receiveInputValue(e, this),
                                      value: this.state.sitePath})
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
                    $el('div', {class: 'fieldset'},
                        $el('div', {class: 'legend'}, 'Lisäasetukset'),
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
                    $el('div', {class: 'fieldset'},
                        $el('div', {class: 'legend'}, 'Lisäasetukset'),
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
        services.myFetch('', {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            data: JSON.stringify(data)
        })
        .then(res => JSON.parse(res.responseText))
        .then(() => {
            toast($el('p', null,
                'Asennus onnistui. ',
                $el('a', {href: this.state.baseUrl + (!this.state.mainQueryVar ? '' : 'index.php?' + this.state.mainQueryVar + '=/')}, 'Siirry'),
                ' uudelle sivustolle.'
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
