<?php

namespace Rad\Tests;

use RadCms\Templating\DefaultFunctions;
use RadCms\Content\DAO;
use PHPUnit\Framework\TestCase;

final class WebsiteDefaultFunctionsTest extends TestCase {
    use DefaultFunctions; // trait jota testataan
    private $__ctx;       // prop josta testattava trait on riippuvainen
    /**
     * @before
     */
    public function before() {
        $this->__ctx = ['contentNodeDao' => new DAO()];
    }
    public function testToSqlGeneratesFetchOneQuery() {
        $query1 = $this->fetchOne('Generics')->where('name=\'Foo\'');
        $this->assertEquals(
            'select `id`,`name`,`json` from ${p}contentNodes where name=\'Foo\'',
            $query1->toSql()
        );
        $query2 = $this->fetchOne('Generics')->where('name=\'Bar\'');
        $this->assertEquals(
            'select `id`,`name`,`json` from ${p}contentNodes where name=\'Bar\'',
            $query2->toSql()
        );
    }
    public function testToSqlGeneratesFetchAllQuery() {
        $query1 = $this->fetchAll('Articles');
        $this->assertEquals(
            'select `id`,`name`,`json` from ${p}contentNodes where' .
            ' `contentTypeId` = (select `id` from ${p}contentTypes where' .
                                 ' `name` = \'Articles\')',
            $query1->toSql()
        );
        $query2 = $this->fetchAll('Pages');
        $this->assertEquals(
            'select `id`,`name`,`json` from ${p}contentNodes where' .
            ' `contentTypeId` = (select `id` from ${p}contentTypes where' .
                                 ' `name` = \'Pages\')',
            $query2->toSql()
        );
    }
    public function testToSqlValidatesItself() {
        $runInvalid = function ($query) {
            try { $query->toSql(); } catch (\RuntimeException $e) { return $e->getMessage(); }
        };
        $whereError = 'fetchOne(...)->where() is required.';
        $query1 = $this->fetchAll('');
        $this->assertEquals('contentTypeName is required', $runInvalid($query1));
        $query2 = $this->fetchOne('');
        $this->assertEquals('contentTypeName is required\n'.$whereError, $runInvalid($query2));
        $query3 = $this->fetchOne('foo');
        $this->assertEquals($whereError, $runInvalid($query3));
        $query4 = $this->fetchOne(str_repeat('-', 65))->where('1=1');
        $this->assertEquals('contentTypeName too long (max 64, was 65).', $runInvalid($query4));
    }
}
