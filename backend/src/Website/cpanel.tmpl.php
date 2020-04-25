<!DOCTYPE html>
<html>
    <head>
        <meta charset="utf-8">
        <link rel="stylesheet" href="<?= RAD_BASE_URL ?>frontend/common.css">
        <link rel="stylesheet" href="<?= RAD_BASE_URL ?>frontend/vendor/vendor.bundle.css">
        <link rel="stylesheet" href="<?= RAD_BASE_URL ?>frontend/cpanel-app.css">
    </head>
    <body>
        <div id="root">
            <div id="cpanel-app"></div>
            <iframe src="<?= $this->url($q) ?>" id="rad-site-iframe"></iframe>
        </div>
        <script>(function() {
            document.getElementById('rad-site-iframe').addEventListener('load', e => {
                const baseUrlWithTrailingSlash = '<?= $this->url('/') ?>';
                const baseUrl = baseUrlWithTrailingSlash.substr(0, baseUrlWithTrailingSlash.length - 1);
                const c = e.target.contentWindow.location.href.split('#')[0].replace(baseUrl, `${baseUrl}/edit`);
                const p = (!c.endsWith('edit/') ? c : c.substr(0, c.length - 1)) + window.location.hash;
                if (window.location.href !== p)
                    history.replaceState(null, null, p.replace(window.location.origin, ''));
            });
        }());</script>
        <script src="<?= $this->assetUrl('frontend/vendor/vendor.bundle.min.js') ?>"></script>
        <script src="<?= $this->assetUrl('frontend/rad-commons.js') ?>"></script>
        <script src="<?= $this->assetUrl('frontend/rad-cpanel-commons.js') ?>"></script>
        <?= $this->jsBundle($adminJsFiles) ?>
        <script src="<?= $this->assetUrl('frontend/rad-cpanel-app.js') ?>"></script>
    </body>
</html>