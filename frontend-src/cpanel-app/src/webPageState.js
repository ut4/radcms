import {urlUtils} from '@rad-commons';

const state = {
    currentContentPanels: [],
    currentPagePath: null,
    /**
     * @param {PageLoadArgs} dataFromWebPageIframe
     */
    update(dataFromWebPageIframe) {
        this.currentContentPanels = dataFromWebPageIframe.contentPanels
            .map((p, i) => { p.idx = i; return p; });
        this.currentPagePath = dataFromWebPageIframe.currentPagePath;
        urlUtils.currentPagePath = this.currentPagePath;
    }
};

export default state;
