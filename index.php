<?php

define('RAD_VERSION', 'preview-0.1.0');

$config = require 'config.php';
$loader = require RAD_BASE_PATH . 'vendor/autoload.php';
$loader->addPsr4('RadPlugins\\', RAD_SITE_PATH . 'plugins');
$loader->addPsr4('RadTheme\\', RAD_SITE_PATH . 'theme');

////////////////////////////////////////////////////////////////////////////////
$logger = new \Monolog\Logger('mainLogger');
$logger->pushHandler(!(RAD_FLAGS & RAD_DEVMODE)
    ? new \Monolog\Handler\ErrorLogHandler()
    : new \Monolog\Handler\StreamHandler('php://output'));
\RadCms\Common\LoggerAccess::setLogger($logger);

////////////////////////////////////////////////////////////////////////////////
set_error_handler(function ($_errno, $errstr, $errfile, $errline) {
    throw new \Pike\PikeException(sprintf('%s in %s on line %d', $errstr, $errfile, $errline),
                                  \Pike\PikeException::ERROR_EXCEPTION);
});
if (!(RAD_FLAGS & RAD_DEVMODE)) {
    error_reporting(E_RECOVERABLE_ERROR);
    // https://stackoverflow.com/a/2146171
    register_shutdown_function(function () use ($logger) {
        if (!($e = error_get_last())) return;
        $logger->error(sprintf('%d @%s:%d %s%s', $e['type'], $e['file'], $e['line'],
                               $e['message'], PHP_EOL));
    });
}

////////////////////////////////////////////////////////////////////////////////
\RadCms\App::create($config, [\Pike\App::SERVICE_DB => \Pike\App::MAKE_AUTOMATICALLY,
                              \Pike\App::SERVICE_AUTH => \Pike\App::MAKE_AUTOMATICALLY])
    ->handleRequest(RAD_BASE_URL, $_GET[RAD_QUERY_VAR] ?? null);
