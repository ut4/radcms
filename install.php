<?php

define('RAD_BACKEND_PATH', __DIR__ . '/backend/'); // /src
define('RAD_WORKSPACE_PATH', __DIR__ . '/');       // /site, /plugins

// Do not edit below this line -------------------------------------------------

if (version_compare(phpversion(), '7.2.0', '<'))
    die('RadCMS requires PHP 7.2 or later.');
if (!function_exists('random_bytes'))
    die('!function_exists(\'random_bytes\') for some reason.');
foreach (['pdo_mysql', 'mbstring', 'fileinfo'] as $ext)
    if (!extension_loaded($ext))
        die("{$ext} extension is required by RadCMS.");

define('RAD_PUBLIC_PATH', __DIR__ . '/');
$loader = require RAD_BACKEND_PATH . 'vendor/autoload.php';
$loader->addPsr4('RadCms\\Installer\\', RAD_BACKEND_PATH . 'installer/src');
$loader->addPsr4('RadPlugins\\', RAD_WORKSPACE_PATH . 'plugins');

$ctx = new \RadCms\AppContext(['db' => \Pike\App::MAKE_AUTOMATICALLY]);
\Pike\App::create([\RadCms\Installer\Module::class], [], $ctx)
    ->handleRequest('', $_GET['q'] ?? '/');
