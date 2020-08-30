<?php

// Ajo: ks. ../README.md

$masterSitePath = dirname(__DIR__, 3) . '/';
$setup = include $masterSitePath . '/backend/tests/plugin-test-bootstrap.php';
$setup(__DIR__);
