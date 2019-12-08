import {services, components} from '../../../rad-commons.js';
const {View} = components;

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
            $el('label', null,
                $el('span', null, 'Salausavain'),
                $el('input', {name: 'signingKey', value: 'my-encrypt-key'})
            ),
            $el('button', {className: 'nice-button nice-button-primary'}, 'Paketoi'),
            $el('button', {onClick: () => services.redirect('/'),
                           className: 'text-button',
                           type: 'button'},'Peruuta')
        ));
    }
}

export default WebsitePackView;
