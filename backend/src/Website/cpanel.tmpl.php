<!DOCTYPE html>
<html>
    <head>
        <meta charset="utf-8">
        <link rel="stylesheet" href="<?= RAD_BASE_URL ?>frontend/common.css">
        <link rel="stylesheet" href="<?= RAD_BASE_URL ?>frontend/vendor/vendor.bundle.css">
        <link rel="stylesheet" href="<?= RAD_BASE_URL ?>frontend/cpanel-app/cpanel.css">
    </head>
    <body>
        <iframe src="<?= $this->url($q) ?>" id="rad-site-iframe"></iframe>
        <div id="cpanel-app"></div>
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
        <?= $this->jsBundle(array_merge([
            'frontend/rad-commons.js',
            'frontend/rad-cpanel.js',
        ], $pluginJsFiles, [
            'frontend/rad-cpanel-boot.js'
        ]), true); ?>
    </body>
</html>