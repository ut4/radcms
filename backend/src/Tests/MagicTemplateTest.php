<?php

namespace RadCms\Tests;

use RadCms\Content\DAO;
use PHPUnit\Framework\TestCase;
use RadCms\ContentType\ContentTypeCollection;
use RadCms\Framework\Db;
use RadCms\Templating\MagicTemplate;

final class MagicTemplateTest extends TestCase {
    private $template;
    public function setup() {
        $this->A_LONG_STRING = str_repeat('-', 65);
        $ctypes = new ContentTypeCollection();
        $ctypes->add('Generics', '', ['content' => 'text']);
        $this->template = new MagicTemplate('', null,
            new DAO($this->createMock(Db::class), $ctypes));
    }
    public function testFetchOneGeneratesSql() {
        $query1 = $this->template->fetchOne('Generics')->where('id=\'1\'');
        $this->assertEquals(
            'SELECT `id`, `content`, \'Generics\' AS `contentType`' .
            ' FROM ${p}Generics WHERE id=\'1\'',
            $query1->toSql()
        );
    }
    public function testFetchAllGeneratesSql() {
        $query1 = $this->template->fetchAll('Generics');
        $this->assertEquals(
            'SELECT `id`, `content`, \'Generics\' AS `contentType`' .
            ' FROM ${p}Generics',
            $query1->toSql()
        );
    }
}
