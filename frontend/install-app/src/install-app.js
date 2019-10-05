import {Form, Toaster} from '../../src/common-components.js';
import services from '../../src/common-services.js';
const $el = preact.createElement;

class InstallApp extends preact.Component {
    constructor(props) {
        super(props);
        const l = sessionStorage.lastTyped;
        this.sitePath = props.sitePath;
        this.state = !l ? {
            dbHost: '127.0.0.1',
            dbDatabase: 'rad',
            dbUser: 'username',
            dbPass: '',
            dbTablePrefix: 'rad_',
            dbCharset: 'utf8',
            siteName: 'test',
            baseUrl: '/',
            radPath: this.sitePath + 'backend/',
            sampleContent: 'minimal'
        } : JSON.parse(l);
    }
    render() {
        return $el('div', null,
            $el(Toaster),
            $el(Form, {onConfirm: e => this.confirm(e), confirmButtonText: 'Asenna', noAutoClose: true},
                $el('h2', null, 'Asenna RadCMS'),
                $el('div', {className: 'view-content box'},
                    $el('label', null,
                        $el('span', {'data-help-text': 'Sivustoprojektin nimi, ei pakollinen.'}, 'Sivuston nimi'),
                        $el('input', {name: 'siteName', onChange: e => Form.receiveInputValue(e, this),
                                      value: this.state.siteName}, null)
                    ),
                    $el('label', null,
                        $el('span', {'data-help-text': '.'}, 'Sivuston baseUrl'),
                        $el('input', {name: 'baseUrl', onChange: e => Form.receiveInputValue(e, this),
                                      value: this.state.baseUrl}, null)
                    ),
                    $el('label', null,
                        $el('span', {'data-help-text': 'RadCMS lähdekoodin sijainti serverillä. Mikäli puuttuu, käytetään oletusta <todo>'}, 'RadCMS-backendin sijainti'),
                        $el('input', {name: 'radPath', onChange: e => Form.receiveInputValue(e, this),
                                      value: this.state.radPath}, null)
                    ),
                    $el('label', null,
                        $el('span', {'data-help-text': 'Sisältö, jolla sivusto alustetaan.'}, 'Esimerkkisisältö'),
                        $el('select', {name: 'sampleContent',
                                       value: this.state.sampleContent},
                            [{name: 'minimal', friendlyName: 'Minimaalinen'},
                             {name: 'blog', friendlyName: 'Blogi'}].map(opt =>
                                $el('option', {value: opt.name,
                                               onClick: e => Form.receiveInputValue(e, this, 'sampleContent')},
                                    opt.friendlyName)
                            ))
                    )
                ),
                $el('div', {className: 'view-content box'},
                    $el('label', null,
                        $el('span', {'data-help-text': 'Tietokantaserverin osoite (host).'}, 'Tietokannan osoite'),
                        $el('input', {name: 'dbHost', onChange: e => Form.receiveInputValue(e, this),
                                      value: this.state.dbHost}, null)
                    ),
                    $el('label', null,
                        $el('span', {'data-help-text': 'Tietokantakäyttäjän nimi, jolla yhdistetään RadCMS:n tietokantaan.'}, 'Tietokantakäyttäjä'),
                        $el('input', {name: 'dbUser', onChange: e => Form.receiveInputValue(e, this),
                                      value: this.state.dbUser}, null)
                    ),
                    $el('label', null,
                        $el('span', {'data-help-text': 'Tietokantakäyttäjän salasana, jolla yhdistetään RadCMS:n tietokantaan.'}, 'Tietokantakäyttäjän salasana'),
                        $el('input', {name: 'dbPass', onChange: e => Form.receiveInputValue(e, this),
                                      value: this.state.dbPass,
                                      type: 'password'}, null)
                    ),
                    $el('label', null,
                        $el('span', {'data-help-text': 'Luotavan RadCMS-tietokannan nimi.'}, 'Tietokannan nimi'),
                        $el('input', {name: 'dbDatabase', onChange: e => Form.receiveInputValue(e, this),
                                      value: this.state.dbDatabase}, null)
                    ),
                    $el('label', null,
                        $el('span', {'data-help-text': 'Prefix, jota käytetään RadCMS:n tietokantataulujen etuliitteenä.'}, 'Tietokantataulujen prefix'),
                        $el('input', {name: 'dbTablePrefix', onChange: e => Form.receiveInputValue(e, this),
                                      value: this.state.dbTablePrefix}, null)
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
        );
    }
    confirm() {
        const data = this.state;
        sessionStorage.lastTyped = JSON.stringify(data);
        services.myFetch('', {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            data: JSON.stringify(data)
        }).then(() => {
            toast($el('p', null,
                'Asennus onnistui. ',
                $el('a', {href: this.state.baseUrl}, 'Siirry'),
                ' uudelle sivustolle.'
            ), 'success');
            window.scrollTo(0, 0);
        }, () => {
            toast('Asennus epäonnistui', 'error');
            window.scrollTo(0, 0);
        });
    }
}
export {InstallApp};
