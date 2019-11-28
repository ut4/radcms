<?php if (!isset($dataToFrontend)) die('Bad usage of /cpanel') ?>
<!DOCTYPE html>
<html>
    <head>
        <meta http-equiv="Content-Type" content="text/html; charset=UTF-8">
        <link rel="stylesheet" href="<?= RAD_BASE_URL ?>frontend/common.css">
        <link rel="stylesheet" href="<?= RAD_BASE_URL ?>frontend/cpanel-app/cpanel.css">
        <link rel="stylesheet" href="<?= RAD_BASE_URL ?>frontend/vendor/vendor.bundle.css">
        <base href="">
    </head>
    <body class="light">
        <div id="cpanel-app"></div>
        <script>window.cpanelProps = <?= json_encode($dataToFrontend) ?></script>
        <?= $this->jsBundle(array_merge([
            'frontend/rad-commons.js',
            'frontend/rad-cpanel.js'
        ], $pluginJsFiles), true); ?>
    </body>
</html>