<?php

namespace RadCms\Tests;

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
        $mainQ = 'SELECT `id`, `title` FROM ${p}Games';
        $this->assertEquals($mainQ . ' WHERE id=\'1\'', $query1->toSql());
        //
        $withRevisions = $this->makeDao(true)->fetchOne('Games')->where('id=2');
        $this->assertEquals(
            'SELECT a.*, r.`revisionSnapshot`, r.`contentType`, r.`createdAt`' .
            ' FROM (' . $mainQ . ' WHERE id=2) AS a' .
            ' LEFT JOIN ${p}contentRevisions r ON (r.`contentId` = a.`id`' .
                                            ' AND r.`contentType` = \'Games\')',
            $withRevisions->toSql()
        );
    }
    public function testFetchOneGeneratesJoinQueries() {
        $mainQ = 'SELECT `id`, `title` FROM ${p}Games WHERE `title`=\'Commandos II\'';
        $joinQ = ' JOIN ${p}Platforms AS b ON (a.`title` = b.`gameTitle`)';
        $query = $this->makeDao()->fetchOne('Games')
            ->join('Platforms', 'a.`title` = b.`gameTitle`')
            ->where("`title`='Commandos II'")
            ->collectJoin('platforms',function(){});
        $this->assertEquals(
            'SELECT a.*, b.`id` AS `bId`' .
                    ', b.`name` AS `bName`, b.`gameTitle` AS `bGameTitle`' .
            ' FROM (' . $mainQ . ') AS a' .
            $joinQ,
            $query->toSql()
        );
        //
        $asLeft = $this->makeDao()->fetchOne('Games')
            ->leftJoin('Platforms', 'a.`title` = b.`gameTitle`')
            ->where("`title`='Commandos II'")
            ->collectJoin('platforms',function(){});
        $this->assertEquals(
            'SELECT a.*, b.`id` AS `bId`' .
                    ', b.`name` AS `bName`, b.`gameTitle` AS `bGameTitle`' .
            ' FROM (' . $mainQ . ') AS a' .
            ' LEFT' . $joinQ,
            $asLeft->toSql()
        );
        //
        $withRevisions = $this->makeDao(true)->fetchOne('Games')
            ->join('Platforms', 'a.`title` = b.`gameTitle`')
            ->where("`title`='Commandos II'")
            ->collectJoin('platforms',function(){});
        $this->assertEquals(
            'SELECT a.*, b.`id` AS `bId`'.
                    ', b.`name` AS `bName`, b.`gameTitle` AS `bGameTitle`' .
                    ', r.`revisionSnapshot`, r.`contentType`, r.`createdAt`' .
            ' FROM (' . $mainQ . ') AS a' .
            $joinQ .
            ' LEFT JOIN ${p}contentRevisions r ON (r.`contentId` = a.`id`' .
                                            ' AND r.`contentType` = \'Games\')',
            $withRevisions->toSql()
        );
    }
    public function testFetchAllGeneratesBasicQuery() {
        $query1 = $this->makeDao()->fetchAll('Platforms');
        $mainQ = 'SELECT `id`, `name`, `gameTitle` FROM ${p}Platforms';
        $this->assertEquals($mainQ, $query1->toSql());
        //
        $withRevisions = $this->makeDao(true)->fetchAll('Platforms');
        $this->assertEquals(
            'SELECT a.*, r.`revisionSnapshot`, r.`contentType`, r.`createdAt`' .
            ' FROM (' . $mainQ . ') AS a' .
            ' LEFT JOIN ${p}contentRevisions r ON (r.`contentId` = a.`id`' .
                                            ' AND r.`contentType` = \'Platforms\')',
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
        $this->assertEquals('fetchOne(...)->where() is required.', $runInvalid(function () {
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
    }
}
