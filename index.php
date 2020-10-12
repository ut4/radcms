<?php

define('RAD_VERSION', '0.3.0-preview3-dev');

$config = require 'config.php';
$loader = require RAD_BACKEND_PATH . 'vendor/autoload.php';
$loader->addPsr4('RadSite\\', RAD_WORKSPACE_PATH . 'site');
$loader->addPsr4('RadPlugins\\', RAD_WORKSPACE_PATH . 'plugins');

////////////////////////////////////////////////////////////////////////////////
$logger = new \Monolog\Logger('mainLogger');
$logger->pushHandler(!(RAD_FLAGS & RAD_DEVMODE)
    ? new \Monolog\Handler\ErrorLogHandler()
    : new \Monolog\Handler\StreamHandler('php://output'));
\RadCms\Common\LoggerAccess::setLogger($logger);

////////////////////////////////////////////////////////////////////////////////
// https://stackoverflow.com/a/2146171
register_shutdown_function(function () use ($logger) {
    if (!($e = error_get_last())) return;
    $logger->error(sprintf('%d @%s:%d %s%s', $e['type'], $e['file'], $e['line'],
                           $e['message'], PHP_EOL));
});

////////////////////////////////////////////////////////////////////////////////
\RadCms\App::create($config, new \RadCms\AppContext([
    'db' => \Pike\App::MAKE_AUTOMATICALLY,
    'auth' => \Pike\App::MAKE_AUTOMATICALLY,
]))->handleRequest(
    ...(!RAD_QUERY_VAR ? ['', RAD_BASE_URL] : [$_GET[RAD_QUERY_VAR], null])
);
