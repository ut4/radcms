<?php

require 'config.php';
require RAD_BASE_PATH . 'vendor/autoload.php';

\RadCms\RadCmsApp::create($config)->handleRequest(
    \RadCms\Request::createFromGlobals(RAD_BASE_URL)
);
