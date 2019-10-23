import '../src/globals.js';
import services from '../src/common-services.js';
import * as components from '../src/common-components.js';
import ControlPanelApp from './src/ControlPanelApp.js';
import uiPanelRegister from './src/UiPanelRegister.js';

const cpanelBoot = {
    /**
     * @param {{page: {url: string;}; panels: Array<{id: string; type: string; title: string; contentNodes: Array<Object>;}>; baseUrl: string;}} currentPageData
     */
    boot(currentPageData) {
        services.myFetch.baseUrl = currentPageData.baseUrl.endsWith('/')
            ? currentPageData.baseUrl.substr(0, currentPageData.baseUrl.length-1)
            : currentPageData.baseUrl;
        //
        window.rad.runRegisteredOnLoadFns([uiPanelRegister, services, components]);
        //
        preact.render(preact.createElement(ControlPanelApp, {currentPageData}, null),
                      document.getElementById('cpanel-app'));

        //
        var parentUrlPcs = window.parent.location.href.split('#');
        var tmp = parentUrlPcs[0].split('?rescan=');
        if (tmp[1]) {
            window.parent.history.replaceState(null, window.parent.document.title, tmp[0]);
            document.querySelector('base').href = tmp[0];
        } else if (parentUrlPcs[1]) {
            window.location.hash = parentUrlPcs[1];
            document.querySelector('base').href = parentUrlPcs[0];
        } else {
            document.querySelector('base').href = window.parent.location;
        }

        //
        window.parent.addEventListener('hashchange', e => {
            if (e.newURL !== e.oldURL) window.location.replace(
                window.location.href.split('#')[0] + (window.parent.location.hash || '#/')
            );
        });
    }
};

export default cpanelBoot;
