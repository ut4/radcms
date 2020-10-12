import {Toaster, env} from '@rad-commons';
import ControlPanel from './ControlPanel.jsx';
import CmsUpdateView from './Cms/CmsUpdateView.jsx';
import {PopupDialog} from './Common/PopupDialog.jsx';
import ContentAddView from './Content/ContentAddView.jsx';
import ContentManageView from './Content/ContentManageView.jsx';
import ContentEditView from './Content/ContentEditView.jsx';
import ContentTypesManageView from './ContentType/ContentTypesManageView.jsx';
import PluginsManageView from './Plugin/PluginsManageView.jsx';
import WebsitePackView from './Website/WebsitePackView.jsx';
import WebsiteEditInfoView from './Website/WebsiteEditInfoView.jsx';
import UploadsManageView from './Upload/UploadsManageView.jsx';
import UploadsRescanView from './Upload/UploadsRescanView.jsx';
import UserProfileView from './User/UserProfileView.jsx';
const PreactRouter = preactRouter;
const processedPanel = new Map;

class ControlPanelApp extends preact.Component {
    /**
     * @param {{dataFromAdminBackend: ControlPanelLoadArgs; onIsCollapsedToggled: () => any;}} props
     */
    constructor(props) {
        super(props);
        this.adminPanelBundles = props.dataFromAdminBackend.adminPanels.map(ControlPanel.makePanelBundle);
        this.state = {devDefinedRoutes: this.collectRoutes(this.adminPanelBundles)};
    }
    /**
     * @access protected
     */
    render() {
        return <div>
            <Toaster id="main" ref={ cmp => {
                if (cmp && env.sessionStorage.radMessage) {
                    cmp.addMessage(...JSON.parse(env.sessionStorage.radMessage));
                    delete env.sessionStorage.radMessage;
                }
            } }/>
            <ControlPanel
                dataFromAdminBackend={ this.props.dataFromAdminBackend }
                adminPanelBundles={ this.adminPanelBundles }
                onIsCollapsedToggled={ () => this.props.onIsCollapsedToggled() }
                onContentPanelsLoaded={ panelBundles => {
                    const newRoutes = this.collectRoutes(panelBundles);
                    if (newRoutes)
                        this.setState({devDefinedRoutes: this.state.devDefinedRoutes.concat(newRoutes)});
                } }
                ref={ cmp => { if (cmp && !window.dataBridge.hasControlPanelLoaded()) {
                    window.dataBridge.handleControlPanelLoaded(cmp);
                } } }/>
            <PreactRouter history={ History.createHashHistory() }>
                <ContentAddView path="/add-content/:initialContentTypeName?/:panelIdx?"/>
                <ContentManageView path="/manage-content/:initialContentTypeName?"/>
                <ContentEditView path="/edit-content/:id/:contentTypeName/:panelIdx?/:publish?"/>
                <PluginsManageView path="/manage-plugins"/>
                <UploadsManageView path="/manage-uploads"/>
                <UploadsRescanView path="/rescan-uploads"/>
                <WebsiteEditInfoView path="/edit-website-info"/>
                <CmsUpdateView path="/self-update"/>
                <WebsitePackView path="/pack-website"/>
                <UserProfileView path="/me"/>
                <ContentTypesManageView path="/manage-content-types"/>
                { this.state.devDefinedRoutes }
            </PreactRouter>
            <PopupDialog/>
        </div>;
    }
    /**
     * @param {Array<{ImplClass: any; panel: FrontendPanelConfig; id?: string;}>} panelBundles
     * @access private
     */
    collectRoutes(panelBundles) {
        const newRoutes = [];
        panelBundles.forEach(bundle => {
            if (typeof bundle.ImplClass.getRoutes === 'function' &&
                !processedPanel.has(bundle.ImplClass)) {
                newRoutes.push(...bundle.ImplClass.getRoutes());
                processedPanel.set(bundle.ImplClass, 1);
            }
        });
        return newRoutes;
    }
}

export default ControlPanelApp;
