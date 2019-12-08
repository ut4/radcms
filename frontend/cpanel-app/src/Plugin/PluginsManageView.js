import {services, components} from '../../../rad-commons.js';
const {View} = components;

/**
 * #/manage-plugins
 */
class PluginsManageView extends preact.Component {
    /**
     * @param {Object} props
     */
    constructor(props) {
        super(props);
        this.state = {plugins: [], message: null};
        services.myFetch('/api/plugins')
            .then(res => {
                const plugins = JSON.parse(res.responseText);
                this.setState({plugins, message: plugins.length ? null : 'Ei lisäosia.'});
            })
            .catch(() => {
                this.setState({message: 'Jokin meni pieleen.'});
            });
    }
    /**
     * @access protected
     */
    render() {
        return $el(View, null, $el('div', null,
            $el('h2', null, 'Lisäosat'),
            !this.state.message ? $el('table', {className: 'striped'},
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
                                                 }}, 'Poista asennus')
                        )
                    )
                ))
            ) : $el('p', null, this.state.message)
        ));
    }
    /**
     * @access private
     */
    installPlugin(plugin) {
        if (plugin.isInstalled) return;
        services.myFetch(`/api/plugins/${plugin.name}/install`, {
            method: 'PUT',
            headers: {'content-type': 'application/json'}
        }).then(res => {
            const data = JSON.parse(res.responseText);
            if (data.ok) {
                services.redirect('/', true);
            } else {
                toast(data.error, 'error');
            }
        });
    }
    /**
     * @access private
     */
    uninstallPlugin(plugin) {
        if (!plugin.isInstalled) return;
        services.myFetch(`/api/plugins/${plugin.name}/uninstall`, {
            method: 'PUT',
            headers: {'content-type': 'application/json'}
        }).then(res => {
            const data = JSON.parse(res.responseText);
            if (data.ok) {
                services.redirect('/', true);
            } else {
                toast(data.error, 'error');
            }
        });
    }
}

export default PluginsManageView;
