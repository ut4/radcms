<!DOCTYPE html>
<html>
    <head>
        <meta http-equiv="Content-Type" content="text/html; charset=UTF-8">
        <title>Asennusvelho - RadCMS</title>
        <link rel="stylesheet" href="frontend/common.css">
        <link rel="stylesheet" href="frontend/install-app/install-app.css">
    </head>
    <body class="light">
        <div id="install-app"></div>
        <script src="frontend/vendor/vendor.bundle.min.js"></script>
        <script type="module">
            import InstallApp from './frontend/install-app/src/InstallApp.js';
            preact.render(preact.createElement(InstallApp, {siteDirPath: '<?= $siteDirPath ?>'}),
                          document.getElementById('install-app'));
        </script>
    </body>
</html>