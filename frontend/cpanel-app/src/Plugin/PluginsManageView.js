import services from '../../../src/common-services.js';
import {view, Toaster} from '../../../src/common-components.js';

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
                                                     this.installPlugin(plugin, i);
                                                 }}, 'Asenna')
                                : $el('button', {onClick: () => {
                                                     this.uninstallPlugin(plugin, i);
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
    installPlugin(plugin, i) {
        if (plugin.isInstalled) return;
        services.myFetch(`/api/plugins/${plugin.name}/install`, {
            method: 'PUT',
            headers: {'content-type': 'application/json'}
        }).then(res => {
            const data = JSON.parse(res.responseText);
            if (data.ok) {
                const plugins = this.state.plugins;
                plugins[i].isInstalled = true;
                this.setState({plugins});
            } else {
                toast(data.error, 'error');
            }
        });
    }
    /**
     * @access private
     */
    uninstallPlugin(plugin, i) {
        if (!plugin.isInstalled) return;
        services.myFetch(`/api/plugins/${plugin.name}/uninstall`, {
            method: 'PUT',
            headers: {'content-type': 'application/json'}
        }).then(res => {
            const data = JSON.parse(res.responseText);
            if (data.ok) {
                const plugins = this.state.plugins;
                plugins[i].isInstalled = false;
                this.setState({plugins});
            } else {
                toast(data.error, 'error');
            }
        });
    }
}

export default PluginsManageView;
