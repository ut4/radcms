<?php

namespace RadCms\Tests\Content;

use Pike\TestUtils\{DbTestCase, HttpTestUtils};
use RadCms\Tests\_Internal\ContentTestUtils;
use RadCms\ContentType\{ContentTypeCollection, ContentTypeMigrator};
use RadCms\Content\DAO;

abstract class ContentControllersTestCase extends DbTestCase {
    use HttpTestUtils;
    use ContentTestUtils;
    protected const TEST_PRODUCT_1 = ['id' => '1', 'status' => DAO::STATUS_PUBLISHED,
                                      'title' => 'Tuote1', 'contentType' => 'Products'];
    protected const TEST_PRODUCT_2 = ['id' => '2', 'status' => DAO::STATUS_PUBLISHED,
                                      'title' => 'Tuote2', 'contentType' => 'Products'];
    protected const TEST_PRODUCT_3 = ['id' => '3', 'status' => DAO::STATUS_PUBLISHED,
                                      'title' => 'Tuote3', 'contentType' => 'Products'];
    protected const TEST_BRAND_1 = ['id' => '10', 'status' => DAO::STATUS_PUBLISHED,
                                    'name' => 'Tuotemerkki1', 'contentType' => 'Brands'];
    protected static $testContentTypes;
    protected static $migrator;
    protected $app;
    public static function setUpBeforeClass(): void {
        self::$testContentTypes = ContentTypeCollection::build()
        ->add('Products', 'Tuotteet')
            ->field('title')
        ->add('Brands', 'Tuotemerkit')
            ->field('name')
        ->done();
        self::$migrator = new ContentTypeMigrator(self::getDb());
        // @allow \Pike\PikeException
        self::$migrator->installMany(self::$testContentTypes);
    }
    public static function tearDownAfterClass(): void {
        parent::tearDownAfterClass();
        // @allow \Pike\PikeException
        self::$migrator->uninstallMany(self::$testContentTypes);
        self::clearInstalledContentTypesFromDb();
    }
    protected function setUp(): void {
        parent::setUp();
        $this->app = $this->makeApp('\RadCms\App::create',
                                    $this->getAppConfig(),
                                    '\RadCms\AppContext');
    }
    public function tearDown(): void {
        $this->deleteAllTestProducts();
    }
    protected function verifyContentNodeFromDbEquals($expected) {
        $row = self::$db->fetchOne(
            'SELECT `title`, `status` FROM ${p}Products WHERE `id` = ?',
            [self::TEST_PRODUCT_1['id']]
        ) ?? [];
        $this->assertEquals($expected->title, $row['title']);
        $this->assertEquals($expected->status, $row['status']);
    }
    protected function insertTestProducts(...$products) {
        $this->insertContent('Products', ...array_map(function ($p) {
            return ['id' => $p['id'], 'status' => $p['status'], 'title' => $p['title']];
        }, $products));
    }
    protected function insertTestBrand() {
        $this->insertContent('Brands', ['id' => self::TEST_BRAND_1['id'],
                                        'status' => self::TEST_BRAND_1['status'],
                                        'name' => self::TEST_BRAND_1['name']]);
    }
    protected function deleteAllTestProducts() {
        $this->deleteContent('Products');
    }
    protected function deleteAllRevisions() {
        self::$db->exec('DELETE FROM ${p}contentRevisions');
    }
}
