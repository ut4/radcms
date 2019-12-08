<?php

if (version_compare(phpversion(), '7.1.0', '<'))
    die('RadCMS requires PHP 7.1 or later.');
if (!function_exists('random_bytes'))
    die('!function_exists(\'random_bytes\') for some reason.');
foreach (['pdo_mysql', 'mbstring', 'fileinfo'] as $ext)
    if (!extension_loaded($ext))
        die("{$ext} extension is required by RadCMS.");

$handleRequest = include __DIR__ . '/installer.phar';
$handleRequest($_GET['q'] ?? '/', __DIR__);
