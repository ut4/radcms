import services from '../../../src/common-services.js';
import {view} from '../../../src/common-components.js';

/**
 * #/manage-plugins
 */
class PluginsManageView extends preact.Component {
    /**
     * @param {Object} props
     */
    constructor(props) {
        super(props);
        this.state = {plugins: []};
        services.myFetch('/api/plugins')
            .then(res => {
                this.setState({plugins: JSON.parse(res.responseText)});
            });
    }
    /**
     * @access protected
     */
    render() {
        return view($el('div', null,
            $el('h2', null, 'Lisäosat'),
            this.state.plugins && $el('table', {className: 'striped'},
                $el('thead', null, $el('tr', null,
                    $el('th', null, 'Nimi'),
                    $el('th', null, '')
                )),
                $el('tbody', null, this.state.plugins.map((plugin, i) =>
                    $el('tr', null,
                        $el('td', null, plugin.name),
                        $el('td', null,
                            !plugin.isInstalled
                                ? $el('button', {onClick: () => {
                                                     this.installPlugin(i);
                                                 }}, 'Asenna')
                                : $el('button', {onClick: () => {
                                                     this.uninstallPlugin(i);
                                                 }}, 'Poista')
                        )
                    )
                ))
            )
        ));
    }
    /**
     * @access private
     */
    installPlugin(plugin) {
        if (plugin.isInstalled) return;
    }
    /**
     * @access private
     */
    uninstallPlugin(plugin) {
        if (!plugin.isInstalled) return;
    }
}

export default PluginsManageView;
