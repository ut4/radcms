import {services, components} from '../../../rad-commons.js';
const {View, InputGroup} = components;

/**
 * #/pack-website
 */
class WebsitePackView extends preact.Component {
    /**
     * @access protected
     */
    render() {
        return $el(View, null, $el('form', {action: services.myFetch.makeUrl('/api/packager'),
                                            method: 'POST'},
            $el('h2', null, 'Paketoi sivusto'),
            $el(InputGroup, {label: 'Salausavain'},
                $el('input', {name: 'signingKey', value: 'my-encrypt-key'})
            ),
            $el('div', {className: 'form-buttons'},
                $el('button', {className: 'nice-button primary'}, 'Paketoi'),
                $el('a', {href: '#/'}, 'Peruuta')
            )
        ));
    }
}

export default WebsitePackView;
