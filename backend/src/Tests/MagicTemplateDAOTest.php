<?php

namespace RadCms\Tests;

use RadCms\Tests\Self\DbTestCase;
use RadCms\Tests\Self\ContentTestUtils;
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
        self::$migrator = new ContentTypeMigrator(self::getDb());
        // @allow \RadCms\Common\RadException
        self::$migrator->installMany(self::$testContentTypes);
    }
    public static function tearDownAfterClass($_ = null) {
        parent::tearDownAfterClass($_);
        // @allow \RadCms\Common\RadException
        self::$migrator->uninstallMany(self::$testContentTypes);
        InstallerTest::clearInstalledContentTypesFromDb();
        self::$db->exec('DELETE FROM ${p}ContentRevisions');
        self::$db->commit();
    }
    public function testFetchOneReturnsLatestDraftWhenFetchRevisionsIsEnabled() {
        $this->insertContent('Products', [['Tuote'], [1, self::NOT_PUBLISHED]]);
        $this->insertRevision(1);
        $dao = new MagicTemplateDAO(self::$db, self::$testContentTypes, true);
        $node = $dao->fetchOne('Products')->where('id=?', ['1'])->exec();
        $this->assertEquals(true, $node !== null);
        $this->assertEquals('New title', $node->title);
    }


    ////////////////////////////////////////////////////////////////////////////


    public function testFetchOneDoesNotReturnDraftsWhenFetchRevisionsIsDisabled() {
        $this->insertContent('Products', [['Tuote2'], [2, self::NOT_PUBLISHED]]);
        $this->insertRevision(2);
        $dao = new MagicTemplateDAO(self::$db, self::$testContentTypes, false);
        $node = $dao->fetchOne('Products')->where('id=?', ['2'])->exec();
        $this->assertEquals(true, $node === null);
    }
    private function insertRevision($contentId) {
        if (self::$db->exec('INSERT INTO ${p}ContentRevisions VALUES (?,?,?,?)',
                            [$contentId, 'Products', '{"title":"New title"}', '123']) < 1)
            throw new \Exception('Failed to insert test data');
    }
}
