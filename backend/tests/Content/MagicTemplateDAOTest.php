<?php

namespace RadCms\Tests\Content;

use Pike\TestUtils\DbTestCase;
use RadCms\Content\DAO;
use RadCms\Tests\_Internal\ContentTestUtils;
use RadCms\Content\MagicTemplateDAO;
use RadCms\ContentType\ContentTypeCollection;
use RadCms\ContentType\ContentTypeMigrator;

final class MagicTemplateDAOTest extends DbTestCase {
    use ContentTestUtils;
    private static $testContentTypes;
    private static $migrator;
    public static function setUpBeforeClass(): void {
        self::$testContentTypes = new ContentTypeCollection();
        self::$testContentTypes->add('Products', 'Tuotteet', [
            (object) ['name' => 'title', 'dataType' => 'text']
        ]);
        self::$testContentTypes->add('Reviews', 'Arvostelut', [
            (object) ['name' => 'content', 'dataType' => 'text'],
            (object) ['name' => 'productId', 'dataType' => 'uint'],
        ]);
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
    private static function makeDao($fetchRevisions) {
        return new MagicTemplateDAO(self::$db, self::$testContentTypes, $fetchRevisions);
    }
    public function testFetchOneReturnsLatestDraftWhenFetchRevisionsIsEnabled() {
        $this->insertContent('Products', ['id' => 1,
                                          'status' => DAO::STATUS_DRAFT,
                                          'title' => 'Tuote']);
        $this->insertRevision(1, 'Products', '{"title":"New title"}');
        $dao = self::makeDao(true);
        $node = $dao->fetchOne('Products')->where('id=?', 1)->exec();
        $this->assertNotNull($node);
        $this->assertEquals('New title', $node->title);
    }


    ////////////////////////////////////////////////////////////////////////////


    public function testFetchOneDoesNotReturnDraftsWhenFetchRevisionsIsDisabled() {
        $this->insertContent('Products', ['id' => 2,
                                          'status' => DAO::STATUS_DRAFT,
                                          'title' => 'Tuote2']);
        $this->insertRevision(2, 'Products', '{"title":"New title"}');
        $dao = self::makeDao(false);
        $node = $dao->fetchOne('Products')->where('id=?', 2)->exec();
        $this->assertNull($node);
    }


    ////////////////////////////////////////////////////////////////////////////


    public function testFetchOneJoinProvidesRowsForCollector() {
        $this->insertContent('Products', ['id' => 3, 'title' => 'Tuote3']);
        $this->insertContent('Reviews', ['id' => 1,
                                         'content' => 'I like Turtles',
                                         'productId' => 3],
                                        ['id' => 2,
                                         'content' => 'Turtles!',
                                         'productId' => 3]);
        $dao = self::makeDao(false);
        $node = $dao->fetchOne('Products p')
                    ->join('Reviews r', 'r.productId=p.id')
                    ->collectJoin('reviews', function ($product, $row) {
                        $product->reviews[] = (object)['content' => $row['rContent']];
                    })
                    ->where('id=?', 3)
                    ->exec();
        $this->assertNotNull($node);
        $this->assertEquals('[{"content":"I like Turtles"},{"content":"Turtles!"}]',
                            json_encode($node->reviews));
    }


    ////////////////////////////////////////////////////////////////////////////


    public function testFetchOneDoesNotReturnDeletedContent() {
        $this->insertContent('Products', ['id' => 4,
                                          'status' => DAO::STATUS_DELETED,
                                          'title' => 'Tuote4']);
        $dao = self::makeDao(true);
        $node = $dao->fetchOne('Products')->where('id=?', 4)->exec();
        $this->assertNull($node);
    }
}
