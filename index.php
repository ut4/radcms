<?php

require 'config.php';
require RAD_BASE_PATH . 'vendor/autoload.php';

\RadCms\RadCms::handleRequest(
    // /mybase/ -> /, /mybase/foo -> /foo
    str_replace(RAD_BASE_URL, '', $_SERVER['REQUEST_URI']),
    $config
);
