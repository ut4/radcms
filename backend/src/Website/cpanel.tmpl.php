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
            const baseUrlWithTrailingSlash = '<?= $this->url('/') ?>';
            const baseUrl = baseUrlWithTrailingSlash.substr(0, baseUrlWithTrailingSlash.length - 1);
            const siteIframe = document.getElementById('rad-site-iframe');
            siteIframe.addEventListener('load', () => {
                // 'http://foo.com/dir/path#hash' -> '/dir/path'
                const a = baseUrl + siteIframe.contentWindow.location.href.split('#')[0].split(baseUrl)[1];
                // 'http://foo.com/dir/edit/path#hash' -> '/dir/real/path'
                const b = baseUrl + window.location.href.split('#')[0].split(baseUrl)[1].replace('edit', '').replace('//','/');
                if (a !== b) {
                    let url = a.replace(baseUrl, baseUrl + '/edit');
                    if (url.endsWith('edit/')) url = url.substr(0, url.length - 1);
                    history.pushState(a, siteIframe.contentDocument.title,
                                      url + window.location.hash);
                }
            });
            window.addEventListener('popstate', e => {
                if (!e.state) return;
                siteIframe.contentWindow.location.replace(e.state ? e.state : baseUrl + '/');
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