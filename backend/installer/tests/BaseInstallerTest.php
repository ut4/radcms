<?php

namespace RadCms\Installer\Tests;

use Pike\App;
use Pike\TestUtils\DbTestCase;
use RadCms\Installer\Module;

abstract class BaseInstallerTest extends DbTestCase {
    protected function verifyCreatedMainSchema($s) {
        self::setCurrentDatabase($s->dbDatabase, $s->dbTablePrefix);
        $this->assertEquals(1, count(self::$db->fetchAll(
            'SELECT TABLE_NAME FROM INFORMATION_SCHEMA.TABLES' .
            ' WHERE TABLE_SCHEMA = ? AND TABLE_NAME = ?',
            [$s->dbDatabase, $s->dbTablePrefix . 'cmsState']
        )));
    }
    protected static function setCurrentDatabase($database, $tablePrefix) {
        self::$db->exec("USE {$database}");
        self::$db->setCurrentDatabaseName($database);
        self::$db->setTablePrefix($tablePrefix);
    }
    public function createInstallerApp($config, $ctx, $makeInjector) {
        return App::create([Module::class], $config, $ctx, $makeInjector);
    }
}
