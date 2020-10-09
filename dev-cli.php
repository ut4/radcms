#!/usr/bin/php
<?php

define('RAD_WORKSPACE_PATH', str_replace('\\', '/', __DIR__) . '/');
define('RAD_BACKEND_PATH', RAD_WORKSPACE_PATH . 'backend/');

$loader = require RAD_BACKEND_PATH . 'vendor/autoload.php';
$loader->addPsr4('RadCms\\Cli\\', RAD_WORKSPACE_PATH . 'dev-cli/src');

if ($argc < 2) die(
    "Usage: dev-cli.php make-release <targetDirRelativeToCwd>\n" .
    "       dev-cli.php print-acl-rules\n" .
    "       dev-cli.php make-update-package <settingsFileRelativeToCwd> <signingKey>"
);
$path = implode('/', array_map('urlencode', array_slice($argv, 1)));

\RadCms\Cli\App::create([], new \RadCms\AppContext)
    ->handleRequest(new \Pike\Request("/{$path}", 'PSEUDO'));
