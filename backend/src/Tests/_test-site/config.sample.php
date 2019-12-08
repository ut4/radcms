<?php
if (!defined('RAD_BASE_PATH')) {
define('RAD_BASE_URL',   '/rad/');
define('RAD_QUERY_VAR',  '');
define('RAD_BASE_PATH',  '/path/to/backend/');
define('RAD_INDEX_PATH', '/path/to/backend/src/Tests/_test-site/');
define('RAD_SITE_PATH',  '/path/to/backend/src/Tests/_test-site/');
define('RAD_DEVMODE',    1 << 1);
define('RAD_FLAGS',      RAD_DEVMODE);
}
return [
    'db.host'        => '127.0.0.1',
    'db.database'    => 'radTestSuiteDb',
    'db.user'        => 'user',
    'db.pass'        => 'pass',
    'db.tablePrefix' => 'rad_',
    'db.charset'     => 'utf8',
];
