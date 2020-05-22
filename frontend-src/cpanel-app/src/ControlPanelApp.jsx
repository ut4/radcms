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
     * @param {dataFromBackend: ControlPanelAppProps || {};} props
     */
    constructor(props) {
        super(props);
        this.state = {userDefinedRoutes: false};
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
            <ControlPanel dataFromBackend={ this.props.dataFromBackend }
                          onIsCollapsedToggled={ () => this.props.onIsCollapsedToggled() }
                          onRoutesLoaded={ userDefinedRoutes => this.setState({userDefinedRoutes}) }
                          ref={ cmp => {
                              if (cmp && !window.radCpanelApp) {
                                  window.radCpanelApp = {setup(data) { cmp.setup(data); }};
                              }
                          } }/>
            { this.state.userDefinedRoutes ? <PreactRouter history={ History.createHashHistory() }>
                <ContentAddView path="/add-content/:initialContentTypeName?"/>
                <ContentManageView path="/manage-content/:initialContentTypeName?"/>
                <ContentEditView path="/edit-content/:id/:contentTypeName/:formImpl?/:publish?"/>
                <PluginsManageView path="/manage-plugins"/>
                <WebsitePackView path="/pack-website"/>
                <UserProfileView path="/me"/>
                <ContentTypesManageView path="/manage-content-types"/>
                { this.state.userDefinedRoutes }
            </PreactRouter> : null }
            <PopupDialog/>
        </div>;
    }
}

export default ControlPanelApp;
