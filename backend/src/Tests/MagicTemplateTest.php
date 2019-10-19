<?php

namespace Rad\Tests;

use RadCms\Content\DAO;
use PHPUnit\Framework\TestCase;
use RadCms\ContentType\ContentTypeCollection;
use RadCms\Framework\Db;
use RadCms\Templating\MagicTemplate;

final class MagicTemplateTest extends TestCase {
    private $template;
    private $A_LONG_STRING;
    /**
     * @before
     */
    public function beforeEach() {
        $this->A_LONG_STRING = str_repeat('-', 65);
        $ctypes = new ContentTypeCollection();
        $ctypes->add('Generics', '', ['content' => 'text']);
        $ctypes->add('Articles', '', ['title' => 'text', 'body' => 'text']);
        $ctypes->add($this->A_LONG_STRING, '', ['foo' => 'text']);
        $this->template = new MagicTemplate('', null,
            new DAO($this->createMock(Db::class), $ctypes));
    }
    public function testToSqlGeneratesFetchOneQuery() {
        $query1 = $this->template->fetchOne('Generics')->where('id=\'1\'');
        $this->assertEquals(
            'SELECT `id`, `content` FROM ${p}Generics WHERE id=\'1\'',
            $query1->toSql()
        );
        $query2 = $this->template->fetchOne('Generics')->where('id=\'2\'');
        $this->assertEquals(
            'SELECT `id`, `content` FROM ${p}Generics WHERE id=\'2\'',
            $query2->toSql()
        );
    }
    public function testToSqlGeneratesFetchAllQuery() {
        $query1 = $this->template->fetchAll('Articles');
        $this->assertEquals(
            'SELECT `id`, `title`, `body` FROM ${p}Articles',
            $query1->toSql()
        );
    }
    public function testToSqlValidatesItself() {
        $runInvalid = function ($fn) {
            try { $fn()->toSql(); } catch (\Exception $e) { return $e->getMessage(); }
        };
        $query1 = function() { return $this->template->fetchAll(''); };
        $this->assertEquals('Content type `` not registered', $runInvalid($query1));
        $query2 = function() { return $this->template->fetchOne('Articles'); };
        $this->assertEquals('fetchOne(...)->where() is required.', $runInvalid($query2));
        $query3 = function() { return $this->template->fetchOne($this->A_LONG_STRING)->where('1=1'); };
        $this->assertEquals(
            'ContentType.name must be capitalized and contain only [a-ZA-Z]\n'.
            'ContentType.name must be <= 64 chars long', $runInvalid($query3));
    }
}
