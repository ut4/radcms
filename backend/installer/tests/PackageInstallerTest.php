<?php

namespace RadCms\Installer\Tests;

use Pike\TestUtils\HttpTestUtils;
use RadCms\Tests\_Internal\ContentTestUtils;
use Pike\Request;
use Pike\AppConfig;
use Pike\Auth\Crypto;
use Pike\FileSystem;
use Pike\TestUtils\MockCrypto;
use RadCms\APIConfigsStorage;
use RadCms\Packager\Packager;
use RadCms\CmsState;
use RadCms\ContentType\ContentTypeCollection;
use RadCms\ContentType\ContentTypeMigrator;
use RadCms\Installer\InstallerCommons;
use RadCms\Packager\ZipPackageStream;

final class PackageInstallerTest extends BaseInstallerTest {
    use HttpTestUtils;
    use ContentTestUtils;
    const TEST_DB_NAME1 = 'radPackageInstallerTestDb1';
    private static $tmpTestPackageFilePath;
    private static $testContentTypes;
    private static $migrator;
    private static $testsiteConfig;
    public static function setUpBeforeClass(): void {
        self::$testsiteConfig = array_merge(include TEST_SITE_PATH . 'config.php',
                                            ['db.database' => self::TEST_DB_NAME1,
                                             'db.tablePrefix' => 'pkg_']);
        self::$testContentTypes = new ContentTypeCollection();
        self::$testContentTypes->add('AType', 'Friendly name', [
            (object) ['name' => 'title', 'dataType' => 'text']
        ]);
        self::$migrator = new ContentTypeMigrator(self::getDb());
        self::ensureMainTestDatabaseIsSelected();
        // @allow \Pike\PikeException
        self::$migrator->installMany(self::$testContentTypes);
    }
    public static function tearDownAfterClass(): void {
        parent::tearDownAfterClass();
        self::$db->exec('DROP DATABASE IF EXISTS ' . self::TEST_DB_NAME1);
        @unlink(self::$tmpTestPackageFilePath);
        $r = str_replace('_test-site', '_unpacked-site', TEST_SITE_PATH);
        @unlink("{$r}config.php");
        @unlink("{$r}theme/test-layout1.tmpl.php");
        @unlink("{$r}theme/test-layout2.tmpl.php");
        @unlink("{$r}theme/test-styles1.css");
        @unlink("{$r}theme/test-styles2.css");
        @rmdir("{$r}theme");
        @rmdir("{$r}uploads");
        // @allow \Pike\PikeException
        self::ensureMainTestDatabaseIsSelected();
        self::$migrator->uninstallMany(self::$testContentTypes);
        self::clearInstalledContentTypesFromDb();
    }
    private static function ensureMainTestDatabaseIsSelected() {
        $testDbConfig = include TEST_SITE_PATH . 'config.php';
        self::setCurrentDatabase($testDbConfig['db.database'],
                                 $testDbConfig['db.tablePrefix']);
    }
    public function setUp(): void {
        parent::setUp();
        if (!defined('INDEX_DIR_PATH')) {
            define('INDEX_DIR_PATH', RAD_SITE_PATH);
        }
    }
    public function testInstallerInstallsSiteFromPackageFile() {
        $s = $this->setupInstallTest();
        $this->sendInstallFromPackageRequest($s);
        $this->verifyCreatedMainSchema((object) [
            'dbDatabase' => $s->config['db.database'],
            'dbTablePrefix' => $s->config['db.tablePrefix'],
        ]);
        // todo
    }
    private function setupInstallTest() {
        $state = (object) [
            'templates' => ['test-layout1.tmpl.php',
                            'test-layout2.tmpl.php'],
            'themeAssets' => ['test-styles1.css',
                              'test-styles2.css'],
            'config' => self::$testsiteConfig,
            'reqBody' => (object) [
                'unlockKey' => str_pad('my-signing-and-unlock-key', Crypto::SECRETBOX_KEYBYTES, '0'),
                'baseUrl' => '',
            ],
            'reqFiles' => (object) [
                'packageFile' => ['tmp_name' => '']
            ],
        ];
        $state->reqFiles->packageFile['tmp_name'] = $this->createTestPackage($state);
        self::$tmpTestPackageFilePath = $state->reqFiles->packageFile['tmp_name'];
        return $state;
    }
    private function sendInstallFromPackageRequest($s) {
        $res = $this->createMockResponse('{"ok":"ok","warnings":[]}', 200);
        $app = $this->makeApp([$this,'createInstallerApp'], $this->getAppConfig(),
            (object) ['crypto' => new MockCrypto],
            function ( $injector) {
                $injector->delegate(InstallerCommons::class, function () {
                    $partiallyMocked = $this->getMockBuilder(InstallerCommons::class)
                        ->setConstructorArgs([self::$db, new FileSystem, new MockCrypto,
                            str_replace('_test-site', '_unpacked-site', TEST_SITE_PATH)])
                        ->setMethods(['selfDestruct'])
                        ->getMock();
                    $partiallyMocked->method('selfDestruct')
                        ->willReturn(true);
                    return $partiallyMocked;
                });
            });
        $this->sendRequest(new Request('/from-package', 'POST', $s->reqBody,
            $s->reqFiles), $res, $app);
    }
    private function createTestPackage($s) {
        $fs = new FileSystem;
        $cmsState = new CmsState((object) [
            'siteInfo' => (object) ['name' => 'name', 'lang' => 'fi_FI'],
            'compactContentTypes' => self::$testContentTypes->toCompactForm('Website'),
        ], new APIConfigsStorage($fs));
        $packager = new Packager(self::$db, $fs, new MockCrypto,
            $cmsState, new AppConfig($s->config));
        $config = (object) [
            'signingKey' => $s->reqBody->unlockKey,
            'templates' => $s->templates,
            'themeAssets' => $s->themeAssets,
        ];
        $testPackage = new ZipPackageStream($fs);
        $contents = $packager->packSite($testPackage, $config);
        $testPackageFileLocation = tempnam(sys_get_temp_dir(), 'zip');
        $fs->write($testPackageFileLocation, $contents);
        return $testPackageFileLocation;
    }
}
