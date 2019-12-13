<?php if (!isset($dataToFrontend)) die('Bad usage of /cpanel') ?>
<!DOCTYPE html>
<html>
    <head>
        <meta charset="utf-8">
        <link rel="stylesheet" href="<?= RAD_BASE_URL ?>frontend/common.css">
        <link rel="stylesheet" href="<?= RAD_BASE_URL ?>frontend/cpanel-app/cpanel.css">
        <link rel="stylesheet" href="<?= RAD_BASE_URL ?>frontend/vendor/vendor.bundle.css">
        <base href="">
    </head>
    <body class="light">
        <div id="cpanel-app"></div>
        <script>window.cpanelProps = <?= json_encode($dataToFrontend) ?></script>
        <script type="text/css" id="main-window-admin-css">
            #rad-cpanel-iframe{position:fixed;border:none;height:100%;width:275px;right:0;top:0;z-index:1}
            #rad-cpanel-iframe.expanded{width:100%}
            #rad-highlight-overlay{position:absolute;background-color:rgba(0,90,255,0.18);z-index:0}
        </script>
        <?= $this->jsBundle(array_merge([
            'frontend/rad-commons.js',
            'frontend/rad-cpanel.js',
        ], $pluginJsFiles, [
            'frontend/rad-cpanel-boot.js'
        ]), true); ?>
    </body>
</html>