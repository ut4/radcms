<?php

namespace RadCms\Tests;

use RadCms\Content\MagicTemplateDAO;
use PHPUnit\Framework\TestCase;
use RadCms\ContentType\ContentTypeCollection;
use Pike\Db;
use RadCms\Templating\MagicTemplate;

final class MagicTemplateTest extends TestCase {
    private $template;
    public function setUp() {
        $this->A_LONG_STRING = str_repeat('-', 65);
        $ctypes = new ContentTypeCollection();
        $ctypes->add('Generics', '', ['content' => 'text']);
        $this->template = new MagicTemplate('', null,
            new MagicTemplateDAO($this->createMock(Db::class), $ctypes, false));
    }
    public function testFetchOneGeneratesSql() {
        $query1 = $this->template->fetchOne('Generics')->where('id=\'1\'');
        $this->assertEquals(
            'SELECT `id`, `isPublished`, `content`, \'Generics\' AS `contentType`' .
            ' FROM `${p}Generics` WHERE id=\'1\'',
            $query1->toSql()
        );
    }
    public function testFetchAllGeneratesSql() {
        $query1 = $this->template->fetchAll('Generics');
        $this->assertEquals(
            'SELECT `id`, `isPublished`, `content`, \'Generics\' AS `contentType`' .
            ' FROM `${p}Generics`',
            $query1->toSql()
        );
    }
}
