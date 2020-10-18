import IndexView from './IndexView.jsx';
import FromPackageInstallerView from './FromPackageInstallerView.jsx';
import WizardInstallerView from './WizardInstallerView.jsx';
const PreactRouter = preactRouter;
const baseUrl = location.pathname.replace('install.php', '');

class InstallApp extends preact.Component {
    /**
     * @param {{packageExists: boolean;}} props
     * @access protected
     */
    render({packageExists}) {
        return <PreactRouter history={ History.createHashHistory() }>
            <IndexView path="/"/>
            <FromPackageInstallerView
                path="/from-package"
                baseUrl={ baseUrl }
                packageExists={ packageExists }
                makeUrl={ makeUrl }/>
            <WizardInstallerView
                path="/with-wizard"
                baseUrl={ baseUrl }
                makeUrl={ makeUrl }/>
        </PreactRouter>;
    }
}

/**
 * @param {string} url
 * @param {string=} mainQueryVar
 * @returns {string}
 */
function makeUrl(url, mainQueryVar) {
    return baseUrl + (!mainQueryVar ? url : `index.php?${mainQueryVar}=/${url}`);
}

export default InstallApp;
