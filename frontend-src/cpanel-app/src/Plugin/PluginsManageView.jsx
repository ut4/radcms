import {http, toasters, urlUtils, View} from '@rad-commons';

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
        http.get('/api/plugins')
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
        return <View><div>
            <h2>Lisäosat</h2>
            { !this.state.message ? <table class="striped">
                <thead><tr>
                    <th>Nimi</th>
                    <th></th>
                </tr></thead>
                <tbody>{ this.state.plugins.map((plugin, i) =>
                    <tr>
                        <td>{ plugin.name }</td>
                        <td>{ !plugin.isInstalled
                            ? <button onClick={ () => {
                                          this.installPlugin(plugin, i);
                                      } }
                                      class="nice-button small">Asenna</button>
                            : <button onClick={ () => {
                                          this.uninstallPlugin(plugin, i);
                                      } }
                                      class="nice-button small">Poista asennus</button>
                        }</td>
                    </tr>
                ) }</tbody>
            </table> : <p>{ this.state.message}</p> }
        </div></View>;
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
    http.put(`/api/plugins/${plugin.name}/${url}`, {dum: 'my'})
        .then(() => {
            urlUtils.redirect('/', 'hard');
        })
        .catch(() => {
            toasters.main(`Lisäosan ${url === 'install' ? 'asennus' : 'poisto'} epäonnistui`, 'error');
        });
}

export default PluginsManageView;
