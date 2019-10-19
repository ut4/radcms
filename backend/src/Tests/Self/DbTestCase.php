<?php

namespace RadCms\Tests\Self;

use RadCms\Common\Db;
use PHPUnit\Framework\TestCase;

class DbTestCase extends TestCase {
    protected static $db = null;
    public static function getDb(array $config) {
        if (!self::$db) {
            self::$db = new Db($config);
        } else {
            self::$db->tablePrefix = $config['db.tablePrefix'];
            if (self::$db->database != $config['db.database']) {
                self::$db->exec('use ' . $config['db.database'] . ';');
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
