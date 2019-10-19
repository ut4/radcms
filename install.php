<?php

if (!extension_loaded('pdo_mysql')) die('pdo_mysql extension required.');
if (!extension_loaded('mbstring')) die('mbstring extension required.');

$handleRequest = include __DIR__ . '/installer.phar';
$handleRequest($_GET['q'] ?? '/', __DIR__);
