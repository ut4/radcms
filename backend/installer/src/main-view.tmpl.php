<!DOCTYPE html>
<html>
    <head>
        <meta http-equiv="Content-Type" content="text/html; charset=UTF-8">
        <title>Asennusvelho - RadCMS</title>
        <link rel="stylesheet" href="frontend/rad/vendor/vendor.bundle.css">
        <link rel="stylesheet" href="frontend/rad/common.css">
        <link rel="stylesheet" href="frontend/rad/install-app.css">
    </head>
    <body class="light">
        <div id="install-app"></div>
        <script src="frontend/rad/vendor/vendor.bundle.min.js"></script>
        <script src="frontend/rad/rad-commons.js"></script>
        <script>window.packageExists = <?= $packageExists ? 'true' : 'false' ?></script>
        <script src="frontend/rad/rad-install-app.js"></script>
    </body>
</html>