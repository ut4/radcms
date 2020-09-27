<?php

namespace RadCms\Installer\Tests;

use Pike\{AppConfig, FileSystem, Request, Auth\Crypto};
use Pike\TestUtils\{HttpTestUtils, MockCrypto};
use RadCms\{APIConfigsStorage, AppContext, CmsState, Auth\ACL};
use RadCms\Content\DAO;
use RadCms\ContentType\{ContentTypeCollection, ContentTypeMigrator};
use RadCms\Installer\{InstallerCommons, InstallerControllers};
use RadCms\Packager\{Packager, ZipPackageStream};
use RadCms\Tests\_Internal\{ContentTestUtils, TestSite};
use RadCms\Tests\Packager\PackagerControllersTest;
use RadCms\Tests\User\UserControllersTest;
use RadPlugins\MoviesPlugin\MoviesPlugin;

final class PackageInstallerTest extends BaseInstallerTest {
    use HttpTestUtils;
    use ContentTestUtils;
    const TEST_DB_NAME1 = 'radPackageInstallerTestDb1';
    private static $testContentTypes;
    private static $testContent;
    private static $migrator;
    private static $testSiteConfig;
    private static $targetSitePath;
    public static function setUpBeforeClass(): void {
        self::$targetSitePath = str_replace(TestSite::DIRNAME,
                                            '_unpacked-site',
                                            TestSite::PUBLIC_PATH);
        self::$testSiteConfig = array_merge(include TestSite::PUBLIC_PATH . 'config.php',
                                            ['db.database' => self::TEST_DB_NAME1,
                                             'db.tablePrefix' => 'pkg_']);
        self::$testContentTypes = ContentTypeCollection::build()
        ->add('Books', 'Kirjat')
            ->field('title')
        ->done();
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
        self::removeInstalledSiteFiles();
        // @allow \Pike\PikeException
        self::ensureMainTestDatabaseIsSelected();
        self::$migrator->uninstallMany(self::$testContentTypes);
        self::clearInstalledContentTypesFromDb();
        UserControllersTest::deleteTestUsers();
        MoviesPlugin::setMockPackData(null);
    }
    private static function ensureMainTestDatabaseIsSelected() {
        $testDbConfig = include TestSite::PUBLIC_PATH . 'config.php';
        self::setCurrentDatabase($testDbConfig['db.database'],
                                 $testDbConfig['db.tablePrefix']);
    }
    public function testInstallerInstallsSiteFromPackageFile() {
        $s = $this->setupInstallTest();
        $this->createTestPackageAndWriteItToDisk($s);
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
        $this->verifyInstalledPlugins($s);
        $this->verifyDeletedPackageFile($s);
    }
    private function setupInstallTest() {
        $state = (object) [
            'templates' => array_merge(TestSite::TEMPLATES, ['Site.php']),
            'assets' => TestSite::ASSETS,
            'uploads' => TestSite::UPLOADS,
            'plugins' => TestSite::PLUGINS,
            'moviesPluginPackData' => PackagerControllersTest::makeMockPluginPackData(),
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
                'baseUrl' => RAD_BASE_URL,
            ],
            'testPackageFilePath' => self::$targetSitePath . 'long-random-string.radsite',
        ];
        return $state;
    }
    private function sendInstallFromPackageRequest($s) {
        $res = $this->createMockResponse(json_encode([
            'ok' => 'ok',
            'mainQueryVar' => RAD_QUERY_VAR,
            'warnings' => [],
        ]), 200);
        $ctx = new AppContext(['db' => '@auto', 'auth' => '@auto']);
        $ctx->crypto = new MockCrypto;
        $app = $this->makeApp([$this,'createInstallerApp'], $this->getAppConfig(),
            $ctx, function ($injector) {
                $injector->define(InstallerControllers::class, [
                    ':packageLocationPath' => self::$targetSitePath
                ]);
                $injector->delegate(InstallerCommons::class, function () {
                    $partiallyMocked = $this->getMockBuilder(InstallerCommons::class)
                        ->setConstructorArgs([self::$db, new FileSystem, new MockCrypto,
                            self::$targetSitePath, self::$targetSitePath])
                        ->setMethods(['selfDestruct'])
                        ->getMock();
                    $partiallyMocked->expects($this->once())
                        ->method('selfDestruct')
                        ->willReturn(true);
                    return $partiallyMocked;
                });
            });
        $this->sendRequest(new Request('/from-package', 'POST', $s->reqBody),
                           $res,
                           $app);
    }
    private function verifyInsertedAllContent() {
        $rows = self::$db->fetchAll('SELECT `title` FROM ${p}Books');
        $this->assertCount(2, $rows);
        $this->assertEquals(self::$testContent[0]->title, $rows[0]['title']);
        $this->assertEquals(self::$testContent[1]->title, $rows[1]['title']);
    }
    private function verifyWroteFiles($s) {
        $base = self::$targetSitePath . 'site/';
        $this->assertFileExists("{$base}{$s->templates[0]}");
        $this->assertFileExists("{$base}{$s->templates[1]}");
        $this->assertFileExists("{$base}{$s->templates[2]}");
        //
        $base = self::$targetSitePath . 'frontend/';
        $this->assertFileExists("{$base}{$s->assets[0]}");
        $this->assertFileExists("{$base}{$s->assets[1]}");
        //
        $base = self::$targetSitePath . 'uploads/';
        $this->assertFileExists("{$base}{$s->uploads[0]}");
    }
    private function verifyCreatedConfigFile($s) {
        $expectedQueryVar = RAD_QUERY_VAR;
        $expectedBackendPath = RAD_BACKEND_PATH;
        $expectedPublicPath = self::$targetSitePath;
        $expectedFlags = RAD_FLAGS & RAD_DEVMODE ? 'RAD_DEVMODE' : '0';
        $this->assertStringEqualsFile("{$expectedPublicPath}config.php",
"<?php
if (!defined('RAD_BASE_URL')) {
    define('RAD_BASE_URL',       '{$s->reqBody->baseUrl}');
    define('RAD_QUERY_VAR',      '{$expectedQueryVar}');
    define('RAD_BACKEND_PATH',   '{$expectedBackendPath}');
    define('RAD_WORKSPACE_PATH', '{$expectedPublicPath}');
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
    'db.charset'     => 'utf8mb4',
];
"
        );
    }
    private function verifyInstalledPlugins($s) {
        $this->verifyContentTypeIsInstalled('Movies', true);
        //
        $rows = self::$db->fetchAll('SELECT `title` FROM ${p}Movies');
        $this->assertCount(2, $rows);
        $batches = $s->moviesPluginPackData->initialContent;
        [$_contentTypeName, $expectedContentNodes] = $batches[0];
        $this->assertEquals($expectedContentNodes[0]->title, $rows[0]['title']);
        $this->assertEquals($expectedContentNodes[1]->title, $rows[1]['title']);
    }
    private function verifyDeletedPackageFile($s) {
        $this->assertFileNotExists($s->testPackageFilePath);
    }
    private function createTestPackageAndWriteItToDisk($s) {
        $fs = new FileSystem;
        $cmsState = new CmsState($s->cmsStateData, new APIConfigsStorage($fs));
        $packager = new Packager(self::$db, $fs, new MockCrypto,
            $cmsState, new AppConfig($s->config));
        $config = (object) [
            'signingKey' => $s->reqBody->unlockKey,
            'templates' => $s->templates,
            'assets' => $s->assets,
            'uploads' => $s->uploads,
            'plugins' => $s->plugins,
        ];
        MoviesPlugin::setMockPackData($s->moviesPluginPackData);
        $testPackage = new ZipPackageStream($fs);
        $contents = $packager->packSite($testPackage, $config, $s->testUser,
            new DAO(self::$db, self::$testContentTypes)
        );
        $fs->write($s->testPackageFilePath, $contents);
    }
    private static function removeInstalledSiteFiles() {
        $path = self::$targetSitePath;
        @unlink("{$path}config.php");
        foreach (array_merge(TestSite::TEMPLATES, ['Site.php']) as $relPath)
            @unlink("{$path}site/{$relPath}");
        foreach (TestSite::ASSETS as $relPath)
            @unlink("{$path}frontend/{$relPath}");
        foreach (TestSite::PUBLIC_DIRS as $relPath)
            @rmdir("{$path}frontend/{$relPath}");
        foreach (TestSite::WORKSPACE_DIRS as $relPath)
            @rmdir("{$path}site/{$relPath}");
        foreach (TestSite::UPLOADS as $relPath)
            @unlink("{$path}uploads/{$relPath}");
        @rmdir("{$path}frontend");
        @rmdir("{$path}site");
        @rmdir("{$path}uploads");
    }
}
