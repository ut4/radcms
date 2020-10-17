<?php

namespace RadCms\Tests\Content;

use Pike\TestUtils\DbTestCase;
use RadCms\Content\{DAO, MagicTemplateDAO};
use RadCms\ContentType\{ContentTypeCollection, ContentTypeMigrator};
use RadCms\Tests\_Internal\ContentTestUtils;

final class MagicTemplateDAOTest extends DbTestCase {
    use ContentTestUtils;
    private static $testContentTypes;
    private static $migrator;
    public static function setUpBeforeClass(): void {
        self::$testContentTypes = ContentTypeCollection::build()
        ->add('Products', 'Tuotteet')->field('title')
        ->add('Reviews', 'Arvostelut')
            ->field('content')
            ->field('productId')->dataType('uint')
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
    private static function makeDao($fetchDraft) {
        return new MagicTemplateDAO(self::$db, self::$testContentTypes, $fetchDraft);
    }
    public function testFetchOneReturnsCurrentDraftWhenDraftFetchingIsEnabled() {
        $this->insertContent('Products', ['id' => 1,
                                          'status' => DAO::STATUS_DRAFT,
                                          'title' => 'Tuote']);
        $this->insertRevision(1, 'Products', '{"title":"New title"}', true);
        $dao = self::makeDao(true);
        $node = $dao->fetchOne('Products')->where('id=?', 1)->exec();
        $this->assertNotNull($node);
        $this->assertEquals('New title', $node->title);
    }


    ////////////////////////////////////////////////////////////////////////////


    public function testFetchOneDoesNotReturnCurrentDraftWhenDraftFetchingIsDisabled() {
        $this->insertContent('Products', ['id' => 2,
                                          'status' => DAO::STATUS_DRAFT,
                                          'title' => 'Tuote2']);
        $this->insertRevision(2, 'Products', '{"title":"New title"}', true);
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
                    ->collectPreviousJoin('reviews', function ($product, $row) {
                        $product->reviews[] = (object)['content' => $row->rContent];
                    })
                    ->where('id=?', 3)
                    ->exec();
        $this->assertNotNull($node);
        $this->assertEquals('[{"content":"I like Turtles"},{"content":"Turtles!"}]',
                            json_encode($node->reviews));
    }


    ////////////////////////////////////////////////////////////////////////////


    public function testFetchAllOrdersResult() {
        $this->insertContent('Products', ['id' => 4, 'title' => 'Tuote4'],
                                         ['id' => 5, 'title' => 'Tuote5']);
        $dao = self::makeDao(false);
        $nodes = $dao->fetchAll('Products')->orderBy('id', 'desc')->exec();
        $this->assertEquals(5, $nodes[0]->id);
        $this->assertEquals(4, $nodes[1]->id);
        //
        $dao2 = self::makeDao(true);
        $nodes2 = $dao2->fetchAll('Products')->orderBy('id', 'desc')->exec();
        $this->assertEquals(5, $nodes2[0]->id);
        $this->assertEquals(4, $nodes2[1]->id);
    }


    ////////////////////////////////////////////////////////////////////////////


    public function testFetchOneDoesNotReturnDeletedContent() {
        $this->insertContent('Products', ['id' => 6,
                                          'status' => DAO::STATUS_DELETED,
                                          'title' => 'Tuote6']);
        $dao = self::makeDao(true);
        $node = $dao->fetchOne('Products')->where('id=?', 6)->exec();
        $this->assertNull($node);
    }
}
