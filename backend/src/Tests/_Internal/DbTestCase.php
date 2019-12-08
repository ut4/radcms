<?php

namespace RadCms\Tests\_Internal;

use RadCms\Framework\Db;
use PHPUnit\Framework\TestCase;

class DbTestCase extends TestCase {
    protected static $db = null;
    public static function getDb(array $config = null) {
        if (!$config) {
            $config = require TEST_SITE_PATH . 'config.php';
        }
        if (!self::$db) {
            self::$db = new Db($config);
        } else {
            self::$db->database = $config['db.database'];
            self::$db->tablePrefix = $config['db.tablePrefix'];
            if ($config['db.database']) {
                self::$db->exec('USE ' . $config['db.database'] . ';');
            }
        }
        self::$db->beginTransaction();
        return self::$db;
    }
    public static function tearDownAfterClass($cleanupSql = null) {
        if (self::$db) {
            self::$db->rollback();
            if ($cleanupSql) {
                self::$db->exec($cleanupSql);
            }
        }
    }
}
