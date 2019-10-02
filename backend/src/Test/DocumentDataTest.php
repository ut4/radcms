<?php

namespace Rad\Test;

use RadCms\DDC;
use PHPUnit\Framework\TestCase;

final class DocumentDataTests extends TestCase {
    public function testToSqlGeneratesQueriesForFetchOnes() {
        //
        $ddc1 = new DDC();
        $ddc1->fetchOne('Generics')->where('name=\'Foo\'');
        $this->assertEquals(
            'select * from (select `id`,`name`,`json`, 1 as `dbcId` ' .
                'from contentNodes where name=\'Foo\'' .
            ')',
            $ddc1->toSql()
        );
        //
        $ddc2 = new DDC();
        $ddc2->fetchOne('Generics')->where('name=\'Foo\'');
        $ddc2->fetchOne('Generics')->where('name=\'Bar\'');
        $ddc2->fetchOne('Articles')->where('name=\'Naz\'');
        $this->assertEquals('select * from (select `id`,`name`,`json`, 1 as `dbcId` ' .
            'from contentNodes where name=\'Foo\'' .
        ') union all ' .
        'select * from (select `id`,`name`,`json`, 2 as `dbcId` ' .
            'from contentNodes where name=\'Bar\'' .
        ') union all ' .
        'select * from (select `id`,`name`,`json`, 3 as `dbcId` ' .
            'from contentNodes where name=\'Naz\'' .
        ')', $ddc2->toSql());
    }
    public function testFethcOnesCanBeChained() {
        $ddc = new DDC();
        $ddc->fetchOne('Generics')->where('name=\'Foo\'')
            ->fetchOne('Articles')->where('name=\'Bar\'');
        //
        $this->assertEquals(
            'select * from (select `id`,`name`,`json`, 1 as `dbcId` ' .
                'from contentNodes where name=\'Foo\'' .
            ') union all ' .
            'select * from (select `id`,`name`,`json`, 2 as `dbcId` ' .
                'from contentNodes where name=\'Bar\'' .
            ')',
            $ddc->toSql()
        );
    }
    public function testToSqlGeneratesQueriesForFetchAlls() {
        //
        $ddc1 = new DDC();
        $ddc1->fetchAll('Articles');
        $this->assertEquals(
            'select * from (' .
                'select `id`,`name`,`json`, 1 as `dbcId` from contentNodes where ' .
                '`contentTypeId` = (select `id` from contentTypes where `name` = \'Articles\')' .
            ')', $ddc1->toSql()
        );
        //
        $ddc2 = new DDC();
        $ddc2->fetchAll('Articles');
        $ddc2->fetchAll('Other');
        $this->assertEquals($ddc2->toSql(),
            'select * from (' .
                'select `id`,`name`,`json`, 1 as `dbcId` from contentNodes where ' .
                '`contentTypeId` = (select `id` from contentTypes where `name` = \'Articles\')' .
            ') union all ' .
            'select * from (' .
                'select `id`,`name`,`json`, 2 as `dbcId` from contentNodes where ' .
                '`contentTypeId` = (select `id` from contentTypes where `name` = \'Other\')' .
            ')'
        );
    }
    public function testFethcAllsCanBeChained() {
        $ddc = new DDC();
        $ddc->fetchAll('Generics')->where('name like \'foo%\'')
            ->fetchAll('Articles')->limit('2');
        //
        $this->assertEquals(
            'select * from (' .
                'select `id`,`name`,`json`, 1 as `dbcId` from contentNodes where ' .
                '`contentTypeId` = (select `id` from contentTypes where `name` = \'Generics\')' .
                ' and name like \'foo%\'' .
            ') union all ' .
            'select * from (' .
                'select `id`,`name`,`json`, 2 as `dbcId` from contentNodes where ' .
                '`contentTypeId` = (select `id` from contentTypes where `name` = \'Articles\')' .
                ' limit 2' .
            ')',
            $ddc->toSql()
        );
    }
    public function testToSqlValidatesItself() {
        $runInvalid = function ($dbc) {
            try { $dbc->toSql(); } catch (\RuntimeException $e) { return $e->getMessage(); }
        };
        $whereError = 'fetchOne(...)->where() is required.';
        $ddc = new DDC();
        $dbc1 = $ddc->fetchAll('');
        $this->assertEquals('contentTypeName is required', $runInvalid($dbc1));
        $dbc2 = $ddc->fetchOne('');
        $this->assertEquals('contentTypeName is required\n'.$whereError, $runInvalid($dbc2));
        $dbc3 = $ddc->fetchOne('foo');
        $this->assertEquals($whereError, $runInvalid($dbc3));
        $dbc4 = $ddc->fetchOne(str_repeat('-', 65))->where('1=1');
        $this->assertEquals('contentTypeName too long (max 64, was 65).', $runInvalid($dbc4));
    }
}
