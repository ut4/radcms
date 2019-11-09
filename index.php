<?php

$config = require 'config.php';
require RAD_BASE_PATH . 'vendor/autoload.php';

////////////////////////////////////////////////////////////////////////////////
$logger = new \Monolog\Logger('mainLogger');
$logger->pushHandler(!(RAD_FLAGS & RAD_DEVMODE)
    ? new \Monolog\Handler\ErrorLogHandler()
    : new \Monolog\Handler\StreamHandler('php://output'));
\RadCms\Common\LoggerAccess::setLogger($logger);

////////////////////////////////////////////////////////////////////////////////
set_error_handler(function ($errno, $errstr, $errfile, $errline) {
    throw new \ErrorException($errstr, 0, $errno, $errfile, $errline);
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
\RadCms\App::create($config)->handleRequest(
    \RadCms\Framework\Request::createFromGlobals(RAD_BASE_URL,
        $_GET[RAD_QUERY_VAR] ?? null)
);
