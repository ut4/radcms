<?php if (!isset($dataToFrontend)) die('Bad usage of /cpanel') ?>
<!DOCTYPE html>
<html>
    <head>
        <meta http-equiv="Content-Type" content="text/html; charset=UTF-8">
        <link rel="stylesheet" href="<?= RAD_BASE_URL ?>frontend/common.css">
        <link rel="stylesheet" href="<?= RAD_BASE_URL ?>frontend/cpanel-app/cpanel.css">
        <base href="">
    </head>
    <body class="light">
        <div id="cpanel-app"></div>
        <script src="<?= RAD_BASE_URL ?>frontend/vendor/vendor.bundle.min.js"></script>
        <script>window.rad = (function () {
            var onLoadFns = [];
            return {
                React: preact,
                createElement: preact.createElement,
                onLoad: function(fnToRun) {
                    if (typeof fnToRun != 'function')
                        throw new Error('Usage rad.onLoad(function () {});');
                    onLoadFns.push(fnToRun);
                },
                runRegisteredOnLoadFns: function (args) {
                    onLoadFns.map(function (fn) { fn.apply(null, args); });
                }
            };
        }())</script>
        <?php foreach ($pluginJsFiles as $f) {
            $attrs = [];
            foreach ($f->attrs as $key => $val) $attrs[] = " {$key}=\"{$val}\"";
            echo '<script src="' . RAD_BASE_URL . htmlspecialchars($f->fileName) .
                 '"' . htmlspecialchars(implode('' , $attrs), ENT_NOQUOTES) . '></script>';
        } ?>
        <script type="module">
            import cpanelBoot from '<?= RAD_BASE_URL ?>frontend/cpanel-app/main.js';
            cpanelBoot.boot(<?= json_encode($dataToFrontend) ?>);
        </script>
    </body>
</html>