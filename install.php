<?php

define('RAD_BACKEND_PATH', __DIR__ . '/backend/');

// Do not edit below this line -------------------------------------------------

if (version_compare(phpversion(), '7.2.0', '<'))
    die('RadCMS requires PHP 7.2 or later.');
if (!function_exists('random_bytes'))
    die('!function_exists(\'random_bytes\') for some reason.');
foreach (['pdo_mysql', 'mbstring', 'fileinfo'] as $ext)
    if (!extension_loaded($ext))
        die("{$ext} extension is required by RadCMS.");

define('INDEX_DIR_PATH', __DIR__);
$loader = require RAD_BACKEND_PATH . 'vendor/autoload.php';
$loader->addPsr4('RadCms\\Installer\\', RAD_BACKEND_PATH . 'installer/src');

\Pike\App::create([\RadCms\Installer\Module::class],
                  [],
                  new \RadCms\AppContext(['db' => \Pike\App::MAKE_AUTOMATICALLY]))
    ->handleRequest('', $_GET['q'] ?? '/');
