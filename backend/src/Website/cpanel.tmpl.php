<!DOCTYPE html>
<html>
    <head>
        <meta charset="utf-8">
        <link rel="stylesheet" href="<?= RAD_BASE_URL ?>frontend/rad/vendor/vendor.bundle.css">
        <link rel="stylesheet" href="<?= RAD_BASE_URL ?>frontend/rad/common.css">
        <link rel="stylesheet" href="<?= RAD_BASE_URL ?>frontend/rad/cpanel-app.css">
        <script>window.dataBridge = {
            controlPanel: null,
            waitingData: null,
            /**
             * @returns {boolean}
             */
            hasControlPanelLoaded() {
                return this.controlPanel !== null;
            },
            /**
             * @param {ControlPanel} reactComponentInstance
             */
            handleControlPanelLoaded(reactComponentInstance) {
                this.controlPanel = reactComponentInstance;
                if (this.waitingData) this.controlPanel.handleWebpageLoaded(this.waitingData);
            },
            /**
             * @param {PageLoadArgs} dataFromWebpageIframe
             */
            handleWebpageLoaded(dataFromWebpageIframe) {
                if (this.controlPanel) this.controlPanel.handleWebpageLoaded(dataFromWebpageIframe);
                else this.waitingData = dataFromWebpageIframe;
            }
        }</script>
    </head>
    <body>
        <div id="root">
            <div id="cpanel-app"></div>
            <iframe src="<?= $this->url($url) ?>" id="rad-site-iframe"></iframe>
        </div>
        <script>(function() {
            document.getElementById('rad-site-iframe').addEventListener('load', e => {
                const baseUrl = '<?= $this->url('/') ?>';
                let p = e.target.contentWindow.location.href.split('#')[0]
                    .replace(e.target.contentWindow.origin, '')
                    .replace(baseUrl, `${baseUrl}_edit/`);
                p = (!p.endsWith('/') ? p : p.substr(0, p.length - 1)) + window.location.hash;
                if (window.location.href !== `${window.location.origin}${p}`)
                    history.replaceState(null, null, p);
            });
        }());</script>
        <script src="<?= $this->assetUrl('frontend/rad/vendor/vendor.bundle.min.js') ?>"></script>
        <script src="<?= $this->assetUrl('frontend/rad/rad-commons.js') ?>"></script>
        <script src="<?= $this->assetUrl('frontend/rad/rad-cpanel-commons.js') ?>"></script>
        <?= $this->jsBundle($adminJsFiles) ?>
        <script>window.dataFromAdminBackend = <?= $dataToFrontend ?>;</script>
        <script src="<?= $this->assetUrl('frontend/rad/rad-cpanel-app.js') ?>"></script>
    </body>
</html>