import {Toaster} from '@rad-commons';
import FromPackageInstallerView from './FromPackageInstallerView.jsx';
import WizardInstallerView from './WizardInstallerView.jsx';

class InstallApp extends preact.Component {
    /**
     * @param {{packageExists: string;}} props
     */
    constructor(props) {
        super(props);
        this.state = {installMode: null};
        this.baseUrl = location.pathname.replace('install.php', '');
    }
    /**
     * @access protected
     */
    render() {
        return <div>
            <Toaster autoCloseTimeoutMillis={ 60000 } id="main"/>
            { !this.state.installMode
                ? <div>
                    <h2>Asenna RadCMS</h2>
                    <div class="grid">
                        <button onClick={ () => this.setState({installMode: 'fromPackage'}) }
                                class="nice-button primary huge">
                            Asenna paketista
                        </button>
                        <button onClick={ () => this.setState({installMode: 'wizard'}) }
                                class="nice-button primary huge">
                            Asenna asennusvelholla
                        </button>
                    </div>
                </div>
                : this.state.installMode === 'fromPackage'
                    ? <FromPackageInstallerView
                        baseUrl={ this.baseUrl }
                        packageExists={ this.props.packageExists }
                        makeUrl={ this.makeUrl.bind(this) }/>
                    : <WizardInstallerView
                        baseUrl={ this.baseUrl }
                        makeUrl={ this.makeUrl.bind(this) }/>
            }
        </div>;
    }
    /**
     * @access private
     */
    makeUrl(url, installDetails) {
        const {mainQueryVar} = installDetails;
        return this.baseUrl + (!mainQueryVar
            ? url
            : `index.php?${mainQueryVar}=/${url}`);
    }
}

export default InstallApp;
