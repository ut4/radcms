<?php

namespace RadCms\Installer\Tests;

use Pike\TestUtils\HttpTestUtils;
use RadCms\Tests\_Internal\ContentTestUtils;
use Pike\Request;
use Pike\AppConfig;
use Pike\Auth\Crypto;
use Pike\FileSystem;
use Pike\TestUtils\MockCrypto;
use RadCms\Auth\ACL;
use RadCms\APIConfigsStorage;
use RadCms\AppContext;
use RadCms\Packager\Packager;
use RadCms\CmsState;
use RadCms\ContentType\ContentTypeCollection;
use RadCms\ContentType\ContentTypeMigrator;
use RadCms\Installer\InstallerCommons;
use RadCms\Packager\ZipPackageStream;
use RadCms\Tests\_Internal\TestSite;
use RadCms\Tests\User\UserControllersTest;

final class PackageInstallerTest extends BaseInstallerTest {
    use HttpTestUtils;
    use ContentTestUtils;
    const TEST_DB_NAME1 = 'radPackageInstallerTestDb1';
    private static $tmpTestPackageFilePath;
    private static $testContentTypes;
    private static $testContent;
    private static $migrator;
    private static $testSiteConfig;
    private static $testSitePublicPath;
    public static function setUpBeforeClass(): void {
        self::$testSiteConfig = array_merge(include TestSite::PUBLIC_PATH . 'config.php',
                                            ['db.database' => self::TEST_DB_NAME1,
                                             'db.tablePrefix' => 'pkg_']);
        self::$testSitePublicPath = str_replace(TestSite::DIRNAME, '_unpacked-site', TestSite::PUBLIC_PATH);
        self::$testContentTypes = new ContentTypeCollection();
        self::$testContentTypes->add('Books', 'Kirjat', [
            (object) ['name' => 'title', 'dataType' => 'text']
        ]);
        self::$testContent = [
            (object) ['title' => 'The Lusty Argonian Maid, v1'],
            (object) ['title' => 'The Lusty Argonian Maid, v2']
        ];
        self::$migrator = new ContentTypeMigrator(self::getDb());
        self::ensureMainTestDatabaseIsSelected();
        // @allow \Pike\PikeException
        self::$migrator->installMany(self::$testContentTypes,
                                     [['Books', self::$testContent]]);
    }
    public static function tearDownAfterClass(): void {
        parent::tearDownAfterClass();
        self::$db->exec('DROP DATABASE IF EXISTS ' . self::TEST_DB_NAME1);
        @unlink(self::$tmpTestPackageFilePath);
        $r = self::$testSitePublicPath;
        @unlink("{$r}config.php");
        foreach (array_merge(['Site.php'], TestSite::TEMPLATES, TestSite::ASSETS) as $relPath)
            @unlink("{$r}site/{$relPath}");
        foreach (TestSite::DIRS as $relPath)
            @rmdir("{$r}site/{$relPath}");
        @rmdir("{$r}site");
        @rmdir("{$r}uploads");
        // @allow \Pike\PikeException
        self::ensureMainTestDatabaseIsSelected();
        self::$migrator->uninstallMany(self::$testContentTypes);
        self::clearInstalledContentTypesFromDb();
        UserControllersTest::deleteTestUsers();
    }
    private static function ensureMainTestDatabaseIsSelected() {
        $testDbConfig = include TestSite::PUBLIC_PATH . 'config.php';
        self::setCurrentDatabase($testDbConfig['db.database'],
                                 $testDbConfig['db.tablePrefix']);
    }
    public function setUp(): void {
        parent::setUp();
        if (!defined('INDEX_DIR_PATH')) {
            define('INDEX_DIR_PATH', RAD_PUBLIC_PATH);
        }
    }
    public function testInstallerInstallsSiteFromPackageFile() {
        $s = $this->setupInstallTest();
        $this->sendInstallFromPackageRequest($s);
        $this->verifyCreatedMainSchema($s->config['db.database'],
                                       $s->config['db.tablePrefix']);
        $this->verifyInsertedMainSchemaData($s->cmsStateData->siteInfo->name,
                                            $s->cmsStateData->siteInfo->lang,
                                            $s->cmsStateData->compactAclRules);
        $this->verifyCreatedUserZero($s->testUser->username,
                                     $s->testUser->email,
                                     ACL::ROLE_SUPER_ADMIN,
                                     $s->testUser->passwordHash);
        $this->verifyContentTypeIsInstalled('Books', true);
        $this->verifyInsertedAllContent();
        $this->verifyWroteFiles($s);
        $this->verifyCreatedConfigFile($s);
    }
    private function setupInstallTest() {
        $state = (object) [
            'templates' => TestSite::TEMPLATES,
            'assets' => TestSite::ASSETS,
            'config' => self::$testSiteConfig,
            'cmsStateData' => (object) [
                'siteInfo' => (object) ['name' => 'name', 'lang' => 'fi'],
                'compactContentTypes' => self::$testContentTypes->toCompactForm('Website'),
                'compactAclRules' => (object) [
                    'resources' => (object) [
                        'content' => 1 << 1
                    ],
                    'userPermissions' => (object) [
                        ACL::ROLE_EDITOR => (object) [
                            'content' => (1 << 1),
                        ]
                    ]
                ]
            ],
            'testUser' => UserControllersTest::makeAndInsertTestUser(),
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
        $ctx = new AppContext(['db' => '@auto', 'auth' => '@auto']);
        $ctx->crypto = new MockCrypto;
        $app = $this->makeApp([$this,'createInstallerApp'], $this->getAppConfig(),
            $ctx, function ($injector) {
                $injector->delegate(InstallerCommons::class, function () {
                    $partiallyMocked = $this->getMockBuilder(InstallerCommons::class)
                        ->setConstructorArgs([self::$db, new FileSystem, new MockCrypto,
                            self::$testSitePublicPath])
                        ->setMethods(['selfDestruct'])
                        ->getMock();
                    $partiallyMocked->expects($this->once())
                        ->method('selfDestruct')
                        ->willReturn(true);
                    return $partiallyMocked;
                });
            });
        $this->sendRequest(new Request('/from-package', 'POST', $s->reqBody,
            $s->reqFiles), $res, $app);
    }
    private function verifyInsertedAllContent() {
        $rows = self::$db->fetchAll('SELECT `title` FROM ${p}Books');
        $this->assertCount(2, $rows);
        $this->assertEquals(self::$testContent[0]->title, $rows[0]['title']);
        $this->assertEquals(self::$testContent[1]->title, $rows[1]['title']);
    }
    private function verifyWroteFiles($s) {
        $base = self::$testSitePublicPath . 'site/';
        $this->assertFileExists("{$base}Site.php");
        $this->assertFileExists("{$base}{$s->templates[0]}");
        $this->assertFileExists("{$base}{$s->templates[1]}");
        $this->assertFileExists("{$base}{$s->assets[0]}");
        $this->assertFileExists("{$base}{$s->assets[1]}");
    }
    private function verifyCreatedConfigFile($s) {
        $expectedQueryVar = RAD_QUERY_VAR;
        $expectedBackendPath = RAD_BASE_PATH;
        $expectedPublicPath = self::$testSitePublicPath;
        $expectedFlags = RAD_FLAGS & RAD_DEVMODE ? 'RAD_DEVMODE' : '0';
        $this->assertStringEqualsFile(self::$testSitePublicPath . 'config.php',
"<?php
if (!defined('RAD_BASE_PATH')) {
    define('RAD_BASE_URL',       '{$s->reqBody->baseUrl}');
    define('RAD_QUERY_VAR',      '{$expectedQueryVar}');
    define('RAD_BASE_PATH',      '{$expectedBackendPath}');
    define('RAD_PUBLIC_PATH',    '{$expectedPublicPath}');
    define('RAD_DEVMODE',        1 << 1);
    define('RAD_USE_JS_MODULES', 1 << 2);
    define('RAD_FLAGS',          {$expectedFlags});
}
return [
    'db.host'        => '{$s->config['db.host']}',
    'db.database'    => '{$s->config['db.database']}',
    'db.user'        => '{$s->config['db.user']}',
    'db.pass'        => '{$s->config['db.pass']}',
    'db.tablePrefix' => '{$s->config['db.tablePrefix']}',
    'db.charset'     => 'utf8',
    'mail.transport' => 'phpsMailFunction',
];
"
        );
    }
    private function createTestPackage($s) {
        $fs = new FileSystem;
        $cmsState = new CmsState($s->cmsStateData, new APIConfigsStorage($fs));
        $packager = new Packager(self::$db, $fs, new MockCrypto,
            $cmsState, new AppConfig($s->config));
        $config = (object) [
            'signingKey' => $s->reqBody->unlockKey,
            'templates' => $s->templates,
            'assets' => $s->assets,
        ];
        $testPackage = new ZipPackageStream($fs);
        $contents = $packager->packSite($testPackage, $config, $s->testUser);
        $testPackageFileLocation = tempnam(sys_get_temp_dir(), 'zip');
        $fs->write($testPackageFileLocation, $contents);
        return $testPackageFileLocation;
    }
}
