<?php

namespace RadCms\Tests\Self;

use RadCms\Framework\Db;
use PHPUnit\Framework\TestCase;

class DbTestCase extends TestCase {
    protected static $db = null;
    public static function getDb(array $config = null) {
        if (!$config) {
            $config = include RAD_SITE_PATH . 'config.php';
            $config['db.database'] = 'radTestSuiteDb';
        }
        if (!self::$db) {
            self::$db = new Db($config);
        } else {
            self::$db->tablePrefix = $config['db.tablePrefix'];
            if ($config['db.database']) {
                self::$db->exec('USE ' . $config['db.database'] . ';');
            }
        }
        self::$db->beginTransaction();
        return self::$db;
    }
    /**
     * @afterClass
     */
    public static function tearDownAfterClass($cleanupSql = null) {
        if (self::$db) {
            self::$db->rollback();
            if ($cleanupSql) {
                self::$db->exec($cleanupSql);
            }
        }
    }
}
