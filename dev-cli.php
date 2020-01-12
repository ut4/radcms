#!/usr/bin/php
<?php

$loader = require __DIR__ . '/backend/vendor/autoload.php';
$loader->addPsr4('RadCms\\Cli\\', __DIR__ . '/dev-cli-src/');

if ($argc < 3) die('Usage: dev-cli.php make-release [<targetDirRelativeToCwd>]');
$path = implode('/', array_map('urlencode', array_slice($argv, 1)));

\Pike\App::create([\RadCms\Cli\Module::class], [])->handleRequest(
    new \Pike\Request("/{$path}", 'PSEUDO'));
