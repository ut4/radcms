#!/usr/bin/php
<?php

$loader = require __DIR__ . '/backend/vendor/autoload.php';
$loader->addPsr4('RadCms\\Cli\\', __DIR__ . '/dev-cli-src/');

if ($argc < 2) die(
    'Usage: dev-cli.php make-release [<targetDirRelativeToCwd>]' . PHP_EOL .
    '       dev-cli.php print-acl-rules' . PHP_EOL
);
$path = implode('/', array_map('urlencode', array_slice($argv, 1)));

\Pike\App::create([\RadCms\Cli\Module::class], [], new \RadCms\AppContext)
    ->handleRequest(new \Pike\Request("/{$path}", 'PSEUDO'));
