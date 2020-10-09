<?php

declare(strict_types=1);

namespace RadCms\Installer\Tests;

use Pike\App;
use Pike\Auth\Authenticator;
use Pike\TestUtils\DbTestCase;
use RadCms\Installer\Module;

abstract class BaseInstallerTest extends DbTestCase {
    protected function verifyCreatedMainSchema(string $database,
                                               string $tablePrefix): void {
        self::setCurrentDatabase($database, $tablePrefix);
        $this->assertEquals(1, count(self::$db->fetchAll(
            'SELECT TABLE_NAME FROM INFORMATION_SCHEMA.TABLES' .
            ' WHERE TABLE_SCHEMA = ? AND TABLE_NAME = ?',
            [$database, $tablePrefix . 'cmsState']
        )));
    }
    protected function verifyInsertedMainSchemaData(string $siteName,
                                                    string $siteLang,
                                                    $aclRules): void {
        $row = self::$db->fetchOne('SELECT * FROM ${p}cmsState');
        $this->assertArrayHasKey('name', $row);
        $this->assertEquals($siteName, $row['name']);
        $this->assertEquals($siteLang, $row['lang']);
        if (is_object($aclRules)) {
            $expectedAclRules = $aclRules;
        } else {
            $filePath = $aclRules;
            $expectedAclRules = (include $filePath)();
        }
        $actual = json_decode($row['aclRules']);
        $this->assertEquals(self::sortAclRules($expectedAclRules),
                            self::sortAclRules($actual));
    }
    protected function verifyCreatedUserZero(string $userName,
                                             string $userEmail,
                                             string $passwordHash,
                                             int $userRole): void {
        $row = self::$db->fetchOne('SELECT * FROM ${p}users');
        $this->assertNotNull($row, 'Pitäisi luoda käyttäjä');
        $this->assertEquals($passwordHash, $row['passwordHash']);
        $this->assertEquals($userName, $row['username']);
        $this->assertEquals($userEmail, $row['email']);
        $this->assertEquals($userRole, $row['role']);
        $this->assertEquals(null, $row['activationKey']);
        $this->assertTrue($row['accountCreatedAt'] > time() - 10);
        $this->assertEquals(null, $row['resetKey']);
        $this->assertEquals('0', $row['resetRequestedAt']);
        $this->assertEquals(Authenticator::ACCOUNT_STATUS_ACTIVATED,
                            $row['accountStatus']);
    }
    protected static function setCurrentDatabase(string $database,
                                                 string $tablePrefix): void {
        self::$db->exec("USE {$database}");
        self::$db->setCurrentDatabaseName($database);
        self::$db->setTablePrefix($tablePrefix);
    }
    public static function sortAclRules(object $rules): object {
        $sortedResources = self::sortByKey($rules->resources);
        foreach ($sortedResources as $actionName => $actions) {
            $sortedResources->{$actionName} = is_object($actions)
                ? self::sortByKey($actions)
                : $actions;
        }
        $rules->resources = $sortedResources;
        //
        $sortedPerms = self::sortByKey($rules->userPermissions);
        foreach ($sortedPerms as $userRole => $permissions) {
            $sortedPerms->{$userRole} = self::sortByKey($permissions);}
        $rules->userPermissions = $sortedPerms;
        //
        return $rules;
    }
    private static function sortByKey(object $object): object {
        $sorted = (array) $object;
        uksort($sorted, function ($a, $b){ return $a <=> $b; });
        return (object) $sorted;
    }
    public function createInstallerApp($config, $ctx, $makeInjector): \Pike\App {
        return App::create([Module::class], $config, $ctx, $makeInjector);
    }
}
