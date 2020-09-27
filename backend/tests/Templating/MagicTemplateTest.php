<?php

namespace RadCms\Tests;

use PHPUnit\Framework\TestCase;
use Pike\Db;
use RadCms\Content\MagicTemplateDAO;
use RadCms\ContentType\ContentTypeCollection;
use RadCms\Templating\MagicTemplate;

final class MagicTemplateTest extends TestCase {
    private $template;
    public function setUp(): void {
        $this->A_LONG_STRING = str_repeat('-', 65);
        $ctypes = ContentTypeCollection::build()
        ->add('Generics', 'Test type')
            ->field('content')
        ->done();
        $this->template = new MagicTemplate('', null, null,
            new MagicTemplateDAO($this->createMock(Db::class), $ctypes, false));
    }
    public function testFetchOneGeneratesSql() {
        $query1 = $this->template->fetchOne('Generics')->where('id=\'1\'');
        $this->assertEquals(
            'SELECT `id`, `status`, `content`, \'Generics\' AS `contentType`' .
            ' FROM `${p}Generics` WHERE id=\'1\'',
            $query1->toSql()
        );
    }
    public function testFetchAllGeneratesSql() {
        $query1 = $this->template->fetchAll('Generics');
        $this->assertEquals(
            'SELECT `id`, `status`, `content`, \'Generics\' AS `contentType`' .
            ' FROM `${p}Generics`',
            $query1->toSql()
        );
    }
}
