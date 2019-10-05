<?php

namespace Rad\Tests;

use RadCms\Content\DAO;
use PHPUnit\Framework\TestCase;

final class ContentDAOTest extends TestCase {
    /**
     * @before
     */
    public function beforeEach() {
        $this->dao = new DAO();
    }
    public function testToSqlGeneratesFetchOneQuery() {
        $this->dao->fetchOne('Generics')->where('name=\'Foo\'');
        $this->assertEquals(
            'select `id`,`name`,`json` from ${p}contentNodes where name=\'Foo\'',
            $this->dao->toSql()
        );
        $this->dao->fetchOne('Generics')->where('name=\'Bar\'');
        $this->assertEquals(
            'select `id`,`name`,`json` from ${p}contentNodes where name=\'Bar\'',
            $this->dao->toSql()
        );
    }
    public function testToSqlGeneratesFetchAllQuery() {
        $this->dao->fetchAll('Articles');
        $this->assertEquals(
            'select `id`,`name`,`json` from ${p}contentNodes where' .
            ' `contentTypeId` = (select `id` from ${p}contentTypes where' .
                                 ' `name` = \'Articles\')',
            $this->dao->toSql()
        );
        $this->dao->fetchAll('Pages');
        $this->assertEquals(
            'select `id`,`name`,`json` from ${p}contentNodes where' .
            ' `contentTypeId` = (select `id` from ${p}contentTypes where' .
                                 ' `name` = \'Pages\')',
            $this->dao->toSql()
        );
    }
    public function testToSqlValidatesItself() {
        $runInvalid = function ($dao) {
            try { $dao->toSql(); } catch (\RuntimeException $e) { return $e->getMessage(); }
        };
        $whereError = 'fetchOne(...)->where() is required.';
        $ref1 = $this->dao->fetchAll('');
        $this->assertEquals('contentTypeName is required', $runInvalid($ref1));
        $ref2 = $this->dao->fetchOne('');
        $this->assertEquals('contentTypeName is required\n'.$whereError, $runInvalid($ref2));
        $ref3 = $this->dao->fetchOne('foo');
        $this->assertEquals($whereError, $runInvalid($ref3));
        $ref4 = $this->dao->fetchOne(str_repeat('-', 65))->where('1=1');
        $this->assertEquals('contentTypeName too long (max 64, was 65).', $runInvalid($ref4));
    }
}
