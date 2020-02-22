import {Toaster} from '@rad-commons';
import ControlPanel from './ControlPanel.jsx';
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
            <Toaster/>
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
                <ContentManageView path="/manage-content"/>
                <ContentEditView path="/edit-content/:id/:contentTypeName/:publish?"/>
                <PluginsManageView path="/manage-plugins"/>
                <WebsitePackView path="/pack-website"/>
                <UserProfileView path="/me"/>
                <ContentTypesManageView path="/manage-content-types"/>
                { this.state.userDefinedRoutes }
            </PreactRouter> : null }
            <ControlPanelApp.PopupDialog/>
        </div>;
    }
}

ControlPanelApp.PopupDialog = class extends preact.Component {
    /**
     * @param {{publishApiTo?: any;}} props
     */
    constructor(props) {
        super(props);
        this.rendererProps = null;
        this.state = {Renderer: null};
        (props.publishApiTo || window).popupDialog = this;
    }
    /**
     * @param {any} Renderer
     * @param {any} rendererProps
     * @access public
     */
    open(Renderer, rendererProps) {
        this.rendererProps = rendererProps;
        this.setState({Renderer});
    }
    /**
     * @access public
     */
    close() {
        this.setState({Renderer: null});
    }
    /**
     * @access protected
     */
    render() {
        return this.state.Renderer
            ? preact.createElement(this.state.Renderer, this.rendererProps)
            : null;
    }
};

export default ControlPanelApp;
