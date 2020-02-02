<?php

namespace RadCms\Tests\Content;

use Pike\TestUtils\DbTestCase;
use RadCms\Tests\_Internal\ContentTestUtils;
use RadCms\Content\MagicTemplateDAO;
use RadCms\ContentType\ContentTypeCollection;
use RadCms\ContentType\ContentTypeMigrator;

final class MagicTemplateDAOTest extends DbTestCase {
    use ContentTestUtils;
    const NOT_PUBLISHED = false;
    private static $testContentTypes;
    private static $migrator;
    public static function setUpBeforeClass() {
        self::$testContentTypes = new ContentTypeCollection();
        self::$testContentTypes->add('Products', 'Tuotteet', ['title' => 'text']);
        self::$testContentTypes->add('Reviews', 'Arvostelut', ['content' => 'text',
                                                               'productTitle' => 'text']);
        self::$migrator = new ContentTypeMigrator(self::getDb());
        // @allow \Pike\PikeException
        self::$migrator->installMany(self::$testContentTypes);
    }
    public static function tearDownAfterClass() {
        parent::tearDownAfterClass();
        // @allow \Pike\PikeException
        self::$migrator->uninstallMany(self::$testContentTypes);
        self::clearInstalledContentTypesFromDb();
        self::$db->exec('DELETE FROM ${p}contentRevisions');
        self::$db->commit();
    }
    private static function makeDao($fetchRevisions) {
        return new MagicTemplateDAO(self::$db, self::$testContentTypes, $fetchRevisions);
    }
    public function testFetchOneReturnsLatestDraftWhenFetchRevisionsIsEnabled() {
        $this->insertContent('Products', [['Tuote'], [1, self::NOT_PUBLISHED]]);
        $this->insertRevision(1, 'Products', '{"title":"New title"}');
        $dao = self::makeDao(true);
        $node = $dao->fetchOne('Products')->where('id=?', '1')->exec();
        $this->assertEquals(true, $node !== null);
        $this->assertEquals('New title', $node->title);
    }


    ////////////////////////////////////////////////////////////////////////////


    public function testFetchOneDoesNotReturnDraftsWhenFetchRevisionsIsDisabled() {
        $this->insertContent('Products', [['Tuote2'], [2, self::NOT_PUBLISHED]]);
        $this->insertRevision(2, 'Products', '{"title":"New title"}');
        $dao = self::makeDao(false);
        $node = $dao->fetchOne('Products')->where('id=?', '2')->exec();
        $this->assertEquals(true, $node === null);
    }


    ////////////////////////////////////////////////////////////////////////////


    public function testFetchOneJoinProvidesRowsForCollector() {
        $this->insertContent('Products', [['Tuote3'], [3]]);
        $this->insertContent('Reviews', [['sucks','Tuote3'], [1]],
                                        [['agreed','Tuote3'], [2]]);
        $dao = self::makeDao(false);
        $node = $dao->fetchOne('Products p')
                    ->join('Reviews r', 'r.productTitle=p.title')
                    ->collectJoin('reviews', function ($product, $row) {
                        $product->reviews[] = (object)['content' => $row['rContent']];
                    })
                    ->where('id=?', '3')
                    ->exec();
        $this->assertEquals(true, $node !== null);
        $this->assertEquals('[{"content":"sucks"},{"content":"agreed"}]',
                            json_encode($node->reviews));
    }
}
