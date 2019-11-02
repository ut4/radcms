<?php

if (version_compare(phpversion(), '7.1.0', '<'))
    die('RadCMS requires PHP 7.1 or later.');
if (!function_exists('random_bytes'))
    die('!function_exists(\'random_bytes\') for some reason.');
if (!extension_loaded('pdo_mysql'))
    die('pdo_mysql extension is required by RadCMS.');
if (!extension_loaded('mbstring'))
    die('mbstring extension is required by RadCMS.');

$handleRequest = include __DIR__ . '/installer.phar';
$handleRequest($_GET['q'] ?? '/', __DIR__);
