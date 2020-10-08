<?php
if (!defined('RAD_BASE_URL')) {
define('RAD_BASE_URL',       '/rad/');
define('RAD_QUERY_VAR',      '');
define('RAD_BACKEND_PATH',   '/path/to/backend/');
define('RAD_WORKSPACE_PATH', $workspacePath ?? '/path/to/backend/tests/_test-site/');
define('RAD_PUBLIC_PATH',    $publicPath ?? '/path/to/backend/tests/_test-site/');
define('RAD_DEVMODE',        1 << 1);
define('RAD_USE_JS_MODULES', 1 << 2);
define('RAD_FLAGS',          RAD_DEVMODE);
}
return [
    'db.host'        => '127.0.0.1',
    'db.database'    => 'radTestSuiteDb',
    'db.user'        => 'user',
    'db.pass'        => 'pass',
    'db.tablePrefix' => 'rad_',
    'db.charset'     => 'utf8mb4',
    'db.schemaInitFilePath' => __DIR__ . '/testSuiteDbInit.mariadb.sql',
];
