<?php

namespace RadCms\Tests\Self;

use RadCms\Common\Db;
use PHPUnit\Framework\TestCase;

class DbTestCase extends TestCase {
    protected static $db = null;
    public static function getDb(array $config) {
        if (!self::$db) self::$db = new Db($config);
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
