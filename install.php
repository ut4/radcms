<?php

$handleRequest = include __DIR__ . '/installer.phar';
$handleRequest(isset($_GET['q']) ? $_GET['q'] : '/', __DIR__);
