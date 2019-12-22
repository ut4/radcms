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
        services.http.get('/api/plugins')
            .then(plugins => {
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
        sendInstallOrUninstallRequest(plugin, 'install');
    }
    /**
     * @access private
     */
    uninstallPlugin(plugin) {
        if (!plugin.isInstalled) return;
        sendInstallOrUninstallRequest(plugin, 'uninstall');
    }
}

function sendInstallOrUninstallRequest(plugin, url) {
    services.http.put(`/api/plugins/${plugin.name}/${url}`, {dum: 'my'})
        .then(() => {
            services.redirect('/', true);
        })
        .catch(() => {
            toast(`Lisäosan ${url === 'install' ? 'asennus' : 'poisto'} epäonnistui`, 'error');
        });
}

export default PluginsManageView;
