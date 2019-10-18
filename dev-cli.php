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
    $backendPath = __DIR__ . '/backend/';
    $backendSrcPath = $backendPath . 'src/';
    $buildAssetsPath = $backendPath . 'build-files/';
    $phar = new Phar(__DIR__ . '/installer.phar');
    $getClassMap = include $buildAssetsPath . 'classmap.php';
    $classMap = $getClassMap($backendSrcPath, $buildAssetsPath, $backendPath);
    foreach ($classMap as $filePath) $phar->addFile($filePath);
    $phar->setStub(
"<?php
define('RAD_BASE_PATH', '{$backendSrcPath}');
include 'phar://' . __FILE__ . '/{$buildAssetsPath}Psr4Autoloader.php';
include 'phar://' . __FILE__ . '/{$buildAssetsPath}LoggerInterface.php';
include 'phar://' . __FILE__ . '/{$backendPath}vendor/altorouter/altorouter/AltoRouter.php';
\$loader = new Psr\Psr4Autoloader();
\$loader->register();
\$loader->addNamespace('RadCms', 'phar://' . __FILE__ . '/{$backendSrcPath}');
\RadCms\Common\LoggerAccess::setLogger(new \RadCms\Common\ErrorLogLogger());
//
return function (\$url, \$DIR) {
    \RadCms\Installer\InstallerApp::create(\$DIR)->handleRequest(\$url);
};
__HALT_COMPILER();
?>"
    );
}
