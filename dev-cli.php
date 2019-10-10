#!/usr/bin/php
<?php

$action = $argv[1] ?? '';
if ($action == 'create-installer') {
    createInstaller();
} else {
    echo "Unknown action `{$action}`.\n";
    die();
}

////////////////////////////////////////////////////////////////////////////////

/**
 * Luo self-hostatun installer.phar-tiedoston (tiedosto joka itsessään sisältää
 * kaikki sen tarvitsemat tiedostot).
 */
function createInstaller() {
    $backendSrcPath = __DIR__ . '/backend/src/';
    $buildAssetsPath = __DIR__ . '/backend/build-files/';
    $sitePath = __DIR__ . '/';
    $phar = new Phar($sitePath . 'installer.phar');
    $phar->addFile($backendSrcPath . 'Common/Db.php');
    $phar->addFile($backendSrcPath . 'Request.php');
    $phar->addFile($backendSrcPath . 'Response.php');
    $phar->addFile($backendSrcPath . 'Router.php');
    $phar->addFile($backendSrcPath . 'Templating/Template.php');
    $phar->addFile($backendSrcPath . 'Templating/DefaultFunctions.php');
    $phar->addFile($backendSrcPath . 'Installer/InstallerApp.php');
    $phar->addFile($backendSrcPath . 'Installer/InstallerControllers.php');
    $phar->addFile($backendSrcPath . 'Installer/main-view.tmpl.php');
    $phar->addFile($buildAssetsPath . 'Psr4Autoloader.php');
    $phar->setStub(
"<?php
define('RAD_BASE_PATH', '{$backendSrcPath}');
include 'phar://' . __FILE__ . '/{$buildAssetsPath}Psr4Autoloader.php';
\$loader = new Psr\Psr4Autoloader();
\$loader->register();
\$loader->addNamespace('RadCms', 'phar://' . __FILE__ . '/{$backendSrcPath}');
//
return function (\$url, \$DIR) {
    \RadCms\Installer\InstallerApp::create(\$DIR)->handleRequest(\$url);
};
__HALT_COMPILER();
?>"
    );
}
