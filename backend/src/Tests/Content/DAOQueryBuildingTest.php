<?php

namespace RadCms\Tests\Content;

use PHPUnit\Framework\TestCase;
use RadCms\Content\DAO;
use RadCms\Framework\Db;
use RadCms\ContentType\ContentTypeCollection;
use RadCms\Common\RadException;

final class DAOQueryBuildingTest extends TestCase {
    private function makeDao($useRevisions = false, $alterContentTypesFn = null) {
        $ctypes = new ContentTypeCollection();
        $ctypes->add('Games', 'Pelit', ['title' => 'text']);
        $ctypes->add('Platforms', 'Alustat', ['name' => 'text', 'gameTitle'=>'text']);
        if ($alterContentTypesFn) $alterContentTypesFn($ctypes);
        return new DAO($this->createMock(Db::class), $ctypes, $useRevisions);
    }
    public function testFetchOneGeneratesBasicQueries() {
        $query1 = $this->makeDao()->fetchOne('Games')->where('id=\'1\'');
        $mainQ = 'SELECT `id`, `isPublished`, `title`, \'Games\' AS `contentType` FROM ${p}Games';
        $this->assertEquals($mainQ . ' WHERE id=\'1\'', $query1->toSql());
        //
        $withRevisions = $this->makeDao(true)->fetchOne('Games')->where('id=2');
        $this->assertEquals(
            'SELECT a.*, _r.`revisionSnapshot`, _r.`createdAt` AS `revisionCreatedAt`' .
            ' FROM (' . $mainQ . ' WHERE id=2) AS a' .
            ' LEFT JOIN ${p}contentRevisions _r ON (_r.`contentId` = a.`id`' .
                                            ' AND _r.`contentType` = \'Games\')',
            $withRevisions->toSql()
        );
    }
    public function testFetchOneGeneratesJoinQueries() {
        $mainQ = 'SELECT `id`, `isPublished`, `title`, \'Games\' AS `contentType` FROM ${p}Games' .
                 ' WHERE `title`=\'Commandos II\'';
        $joinQ = ' JOIN ${p}Platforms AS b ON (b.`gameTitle` = a.`title`)';
        $query = $this->makeDao()->fetchOne('Games')
            ->join('Platforms', 'b.`gameTitle` = a.`title`')
            ->where("`title`='Commandos II'")
            ->collectJoin('platforms',function(){});
        $this->assertEquals(
            'SELECT a.*, b.`id` AS `bId`, \'Platforms\' AS `bContentType`' .
                    ', b.`name` AS `bName`, b.`gameTitle` AS `bGameTitle`' .
            ' FROM (' . $mainQ . ') AS a' .
            $joinQ,
            $query->toSql()
        );
        //
        $asLeft = $this->makeDao()->fetchOne('Games')
            ->leftJoin('Platforms', 'b.`gameTitle` = a.`title`')
            ->where("`title`='Commandos II'")
            ->collectJoin('platforms',function(){});
        $this->assertEquals(
            'SELECT a.*, b.`id` AS `bId`, \'Platforms\' AS `bContentType`' .
                    ', b.`name` AS `bName`, b.`gameTitle` AS `bGameTitle`' .
            ' FROM (' . $mainQ . ') AS a' .
            ' LEFT' . $joinQ,
            $asLeft->toSql()
        );
        //
        $withRevisions = $this->makeDao(true)->fetchOne('Games')
            ->join('Platforms', 'b.`gameTitle` = a.`title`')
            ->where("`title`='Commandos II'")
            ->collectJoin('platforms',function(){});
        $this->assertEquals(
            'SELECT a.*, b.`id` AS `bId`, \'Platforms\' AS `bContentType`'.
                    ', b.`name` AS `bName`, b.`gameTitle` AS `bGameTitle`' .
                    ', _r.`revisionSnapshot`, _r.`createdAt` AS `revisionCreatedAt`' .
            ' FROM (' . $mainQ . ') AS a' .
            $joinQ .
            ' LEFT JOIN ${p}contentRevisions _r ON (_r.`contentId` = a.`id`' .
                                            ' AND _r.`contentType` = \'Games\')',
            $withRevisions->toSql()
        );
    }
    public function testFetchOneGeneratesJoinQueriesUsingAliases() {
        $mainQ = 'SELECT `id`, `isPublished`, `title`, \'Games\' AS `contentType` FROM ${p}Games' .
                 ' WHERE 1=1';
        $joinQ = ' JOIN ${p}Platforms AS p ON (p.`gameTitle` = g.`title`)';
        $query = $this->makeDao()->fetchOne('Games g')
            ->join('Platforms p', 'p.`gameTitle` = g.`title`')
            ->where('1=1')
            ->collectJoin('platforms',function(){});
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
        $mainQ = 'SELECT `id`, `isPublished`, `name`, `gameTitle`, \'Platforms\' AS `contentType`' .
                 ' FROM ${p}Platforms';
        $this->assertEquals($mainQ, $query1->toSql());
        //
        $withRevisions = $this->makeDao(true)->fetchAll('Platforms');
        $this->assertEquals(
            'SELECT a.*, _r.`revisionSnapshot`, _r.`createdAt` AS `revisionCreatedAt`' .
            ' FROM (' . $mainQ . ') AS a' .
            ' LEFT JOIN ${p}contentRevisions _r ON (_r.`contentId` = a.`id`' .
                                            ' AND _r.`contentType` = \'Platforms\')',
            $withRevisions->toSql()
        );
    }
    public function testToSqlValidatesItself() {
        $runInvalid = function ($fn) {
            try { $fn()->toSql(); } catch (RadException $e) { return $e->getMessage(); }
        };
        $this->assertEquals('Content type `` not registered', $runInvalid(function () {
            return $this->makeDao()->fetchAll('');
        }));
        $this->assertEquals('fetchOne(...)->where() is required', $runInvalid(function () {
            return $this->makeDao()->fetchOne('Games');
        }));
        $this->assertEquals(
            'ContentType.name must be capitalized and contain only [a-ZA-Z]\n'.
            'ContentType.name must be <= 64 chars long', $runInvalid(function() {
                $A_LONG_STRING = str_repeat('-', 65);
                //
                return $this->makeDao(false, function ($ctypes) use ($A_LONG_STRING) {
                    $ctypes->add($A_LONG_STRING, '', ['field' => 'text']);
                })->fetchOne($A_LONG_STRING)->where('1=1');
            }));
        $this->assertEquals('fetch alias is not valid\n' .
                            'join alias is not valid.', $runInvalid(function () {
            return $this->makeDao()
                ->fetchAll('Games &&')
                ->join('Platforms p-bas', '1=1')
                ->collectJoin('field', function(){});
        }));
    }
}
