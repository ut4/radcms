import {Toaster, services} from '@rad-commons';
import ControlPanel from './ControlPanel.jsx';
import {PopupDialog} from './Common/PopupDialog.jsx';
import ContentAddView from './Content/ContentAddView.jsx';
import ContentManageView from './Content/ContentManageView.jsx';
import ContentEditView from './Content/ContentEditView.jsx';
import ContentTypesManageView from './ContentType/ContentTypesManageView.jsx';
import PluginsManageView from './Plugin/PluginsManageView.jsx';
import WebsitePackView from './Website/WebsitePackView.jsx';
import UserProfileView from './User/UserProfileView.jsx';
const PreactRouter = preactRouter;

class ControlPanelApp extends preact.Component {
    /**
     * @param {{dataFromAdminBackend: ControlPanelLoadArgs; onIsCollapsedToggled: () => any;}} props
     */
    constructor(props) {
        super(props);
        const uniqueImpls = {};
        this.userDefinedRoutes = [];
        this.adminPanelBundles = props.dataFromAdminBackend.adminPanels.map(p => {
            const bundle = ControlPanel.makePanelBundle(p);
            if (!uniqueImpls[p.impl]) {
                uniqueImpls[p.impl] = 1;
                if (typeof bundle.ImplClass.getRoutes === 'function') {
                    const routes = bundle.ImplClass.getRoutes();
                    if (routes) this.userDefinedRoutes = this.userDefinedRoutes.concat(routes);
                }
            }
            return bundle;
        });
    }
    /**
     * @access protected
     */
    render() {
        return <div>
            <Toaster id="main" ref={ cmp => {
                if (cmp && services.sessionStorage.radMessage) {
                    cmp.addMessage(...JSON.parse(services.sessionStorage.radMessage));
                    delete services.sessionStorage.radMessage;
                }
            } }/>
            <ControlPanel
                dataFromAdminBackend={ this.props.dataFromAdminBackend }
                adminPanelBundles={ this.adminPanelBundles }
                onIsCollapsedToggled={ () => this.props.onIsCollapsedToggled() }
                ref={ cmp => { if (cmp && !window.radCpanelApp) {
                    window.radCpanelApp = {
                        handleWebpageLoaded(data) { cmp.handleWebpageLoaded(data); }
                    };
                } } }/>
            <PreactRouter history={ History.createHashHistory() }>
                <ContentAddView path="/add-content/:initialContentTypeName?"/>
                <ContentManageView path="/manage-content/:initialContentTypeName?"/>
                <ContentEditView path="/edit-content/:id/:contentTypeName/:formImpl?/:publish?"/>
                <PluginsManageView path="/manage-plugins"/>
                <WebsitePackView path="/pack-website"/>
                <UserProfileView path="/me"/>
                <ContentTypesManageView path="/manage-content-types"/>
                { this.userDefinedRoutes }
            </PreactRouter>
            <PopupDialog/>
        </div>;
    }
}

export default ControlPanelApp;
