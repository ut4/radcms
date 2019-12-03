<?php

namespace RadCms\Tests;

use RadCms\Tests\Self\DbTestCase;
use RadCms\Content\MagicTemplateDAO;
use RadCms\Framework\Db;
use RadCms\ContentType\ContentTypeCollection;
use RadCms\ContentType\ContentTypeMigrator;
use RadCms\Common\RadException;

final class MagicTemplateDAOTest extends DbTestCase {
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
    public function testFechOneReturnsLatestRevision() {
        if (self::$db->exec('INSERT INTO ${p}Products VALUES (?,1,?)',
                            [1, 'Tuote']) < 1)
            throw new \Exception('Failed to insert test data');
        if (self::$db->exec('INSERT INTO ${p}ContentRevisions VALUES (1,?,?,?)',
                            ['Products', '{"title":"New title"}', '123']) < 1)
            throw new \Exception('Failed to insert test data');
        $dao = new MagicTemplateDAO(self::$db, self::$testContentTypes, true);
        $node = $dao->fetchOne('Products')->where('id=?', ['1'])->exec();
        $this->assertEquals(true, $node !== null);
        $this->assertEquals('New title', $node->title);
    }
}
