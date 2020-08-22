<?php

namespace RadCms\Tests\Content;

use PHPUnit\Framework\TestCase;
use RadCms\Content\DAO;
use Pike\Db;
use RadCms\ContentType\ContentTypeCollection;
use Pike\PikeException;

final class DAOQueryBuildingTest extends TestCase {
    private function makeDao($useRevisions = false, $alterContentTypesFn = null) {
        $ctypes = ContentTypeCollection::build()
        ->add('Games', 'Pelit')
            ->field('title')
        ->add('Platforms', 'Alustat')
            ->field('name')
            ->field('gameTitle')
        ->done();
        if ($alterContentTypesFn) $alterContentTypesFn($ctypes);
        return new DAO($this->createMock(Db::class), $ctypes, $useRevisions);
    }
    public function testFetchOneGeneratesBasicQueries() {
        $query1 = $this->makeDao()->fetchOne('Games')->where('id=\'1\'');
        $mainQ = 'SELECT `id`, `status`, `title`, \'Games\' AS `contentType` FROM `${p}Games`';
        $this->assertEquals($mainQ . ' WHERE id=\'1\'', $query1->toSql());
        //
        $withRevisions = $this->makeDao(true)->fetchOne('Games')->where('id=2')->limit(10, 2);
        $this->assertEquals(
            'SELECT _a.*, _r.`revisionSnapshot`, _r.`createdAt` AS `revisionCreatedAt`' .
            ' FROM (' . $mainQ . ' WHERE id=2 LIMIT 2, 10) AS _a' .
            ' LEFT JOIN ${p}contentRevisions _r ON (_r.`contentId` = _a.`id`' .
                                            ' AND _r.`contentType` = \'Games\')',
            $withRevisions->toSql()
        );
    }
    public function testFetchOneGeneratesJoinQueries() {
        $mainQ = 'SELECT `id`, `status`, `title`, \'Games\' AS `contentType` FROM `${p}Games`' .
                 ' WHERE `title`=\'Commandos II\' LIMIT 10';
        $joinQ = ' JOIN `${p}Platforms` AS b ON (b.`gameTitle` = _a.`title`)';
        $query = $this->makeDao()->fetchOne('Games')
            ->join('Platforms', 'b.`gameTitle` = _a.`title`')
            ->where("`title`='Commandos II'")
            ->limit(10)
            ->collectPreviousJoin('platforms',function(){});
        $this->assertEquals(
            'SELECT _a.*, b.`id` AS `bId`, \'Platforms\' AS `bContentType`' .
                    ', b.`name` AS `bName`, b.`gameTitle` AS `bGameTitle`' .
            ' FROM (' . $mainQ . ') AS _a' .
            $joinQ,
            $query->toSql()
        );
        //
        $asLeft = $this->makeDao()->fetchOne('Games')
            ->leftJoin('Platforms', 'b.`gameTitle` = _a.`title`')
            ->where("`title`='Commandos II'")
            ->limit(10)
            ->collectPreviousJoin('platforms',function(){});
        $this->assertEquals(
            'SELECT _a.*, b.`id` AS `bId`, \'Platforms\' AS `bContentType`' .
                    ', b.`name` AS `bName`, b.`gameTitle` AS `bGameTitle`' .
            ' FROM (' . $mainQ . ') AS _a' .
            ' LEFT' . $joinQ,
            $asLeft->toSql()
        );
        //
        $withRevisions = $this->makeDao(true)->fetchOne('Games')
            ->join('Platforms', 'b.`gameTitle` = _a.`title`')
            ->where("`title`='Commandos II'")
            ->limit(10)
            ->collectPreviousJoin('platforms',function(){});
        $this->assertEquals(
            'SELECT _a.*, b.`id` AS `bId`, \'Platforms\' AS `bContentType`'.
                    ', b.`name` AS `bName`, b.`gameTitle` AS `bGameTitle`' .
                    ', _r.`revisionSnapshot`, _r.`createdAt` AS `revisionCreatedAt`' .
            ' FROM (' . $mainQ . ') AS _a' .
            $joinQ .
            ' LEFT JOIN ${p}contentRevisions _r ON (_r.`contentId` = _a.`id`' .
                                            ' AND _r.`contentType` = \'Games\')',
            $withRevisions->toSql()
        );
    }
    public function testFetchOneGeneratesJoinQueriesWithAliases() {
        $mainQ = 'SELECT `id`, `status`, `title`, \'Games\' AS `contentType` FROM `${p}Games`' .
                 ' WHERE 1=1';
        $joinQ = ' JOIN `${p}Platforms` AS p ON (p.`gameTitle` = g.`title`)';
        $query = $this->makeDao()->fetchAll('Games g')
            ->join('Platforms p', 'p.`gameTitle` = g.`title`')
            ->where('1=1')
            ->collectPreviousJoin('platforms',function(){});
        $this->assertEquals(
            'SELECT g.*, p.`id` AS `pId`, \'Platforms\' AS `pContentType`' .
                    ', p.`name` AS `pName`, p.`gameTitle` AS `pGameTitle`' .
            ' FROM (' . $mainQ . ') AS g' .
            $joinQ,
            $query->toSql()
        );
    }
    public function testFetchAllGeneratesBasicQuery() {
        $query1 = $this->makeDao()->fetchAll('Platforms');
        $mainQ = 'SELECT `id`, `status`, `name`, `gameTitle`, \'Platforms\' AS `contentType`' .
                 ' FROM `${p}Platforms`';
        $this->assertEquals($mainQ, $query1->toSql());
        //
        $withRevisions = $this->makeDao(true)->fetchAll('Platforms');
        $this->assertEquals(
            'SELECT _a.*, _r.`revisionSnapshot`, _r.`createdAt` AS `revisionCreatedAt`' .
            ' FROM (' . $mainQ . ') AS _a' .
            ' LEFT JOIN ${p}contentRevisions _r ON (_r.`contentId` = _a.`id`' .
                                            ' AND _r.`contentType` = \'Platforms\')',
            $withRevisions->toSql()
        );
    }
    public function testFetchAllAddsMultipleJoins() {
        $mainQ = 'SELECT `id`, `status`, `title`, \'Games\' AS `contentType` FROM `${p}Games`' .
                 ' WHERE 1=1';
        $joinQ = ' JOIN `${p}Platforms` AS p1 ON (p1.`gameTitle` = _a.`title`)' .
                 ' LEFT JOIN `${p}Platforms` AS p2 ON (2=2)';
        $query = $this->makeDao()->fetchOne('Games')
            ->join('Platforms p1', 'p1.`gameTitle` = _a.`title`')
            ->leftJoin('Platforms p2', '2=2')
            ->where('1=1')
            ->collectPreviousJoin('platforms',function(){});
        $this->assertEquals(
            'SELECT _a.*, p1.`id` AS `p1Id`, \'Platforms\' AS `p1ContentType`' .
                    ', p1.`name` AS `p1Name`, p1.`gameTitle` AS `p1GameTitle`' .
                    ', p2.`id` AS `p2Id`, \'Platforms\' AS `p2ContentType`' .
                    ', p2.`name` AS `p2Name`, p2.`gameTitle` AS `p2GameTitle`' .
            ' FROM (' . $mainQ . ') AS _a' .
            $joinQ,
            $query->toSql()
        );
    }
    public function testToSqlValidatesItself() {
        $runInvalid = function ($fn) {
            try { $fn()->toSql(); } catch (PikeException $e) { return $e->getMessage(); }
        };
        $this->assertEquals('Content type `` not registered', $runInvalid(function () {
            return $this->makeDao()->fetchAll('');
        }));
        $this->assertEquals('fetchOne(...)->where() is required', $runInvalid(function () {
            return $this->makeDao()->fetchOne('Games');
        }));
        $this->assertEquals(
            'name must contain only [a-zA-Z0-9_] and start with [a-zA-Z_]\n'.
            'The length of name must be 64 or less\n'.
            'The length of friendlyName must be at least 1', $runInvalid(function() {
                $A_LONG_STRING = str_repeat('-', 65);
                //
                return $this->makeDao(false, function ($ctypes) use ($A_LONG_STRING) {
                    $ctypes->add($A_LONG_STRING, '', 'Kuvaus', [
                        (object) ['name' => 'field', 'dataType' => (object) ['type' => 'text', 'length' => null]]
                    ]);
                })->fetchOne($A_LONG_STRING)->where('1=1');
            }));
        $this->assertEquals('fetch alias (&&) is not valid\n' .
                            'join alias (p-bas) is not valid', $runInvalid(function () {
            return $this->makeDao()
                ->fetchAll('Games &&')
                ->join('Platforms p-bas', '1=1')
                ->collectPreviousJoin('field', function(){});
        }));
    }
}
