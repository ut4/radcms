<?php

$config = require 'config.php';
require RAD_BASE_PATH . 'vendor/autoload.php';

$logger = new \Monolog\Logger('mainLogger');
$logger->pushHandler(new \Monolog\Handler\ErrorLogHandler());
\RadCms\Common\LoggerAccess::setLogger($logger);

\RadCms\App::create($config)->handleRequest(
    \RadCms\Framework\Request::createFromGlobals(RAD_BASE_URL,
        $_GET[RAD_QUERY_VAR] ?? null)
);
