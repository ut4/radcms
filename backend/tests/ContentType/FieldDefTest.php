<?php

namespace RadCms\Tests\Content;

use PHPUnit\Framework\TestCase;
use RadCms\ContentType\FieldDef;

final class FieldDefTest extends TestCase {
    public function testToSqlTableFieldTranslatesDatatypeCorrectly() {
        foreach ([
            [(object) ['type' => 'text', 'length' => null], 'TEXT'],
            [(object) ['type' => 'text', 'length' => 12],   'VARCHAR(12)'],
            [(object) ['type' => 'json', 'length' => null], 'JSON'],
            [(object) ['type' => 'json', 'length' => 12],   'JSON'],
            [(object) ['type' => 'int',  'length' => null], 'INT'],
            [(object) ['type' => 'int',  'length' => 2],    'INT(2)'],
            [(object) ['type' => 'uint', 'length' => null], 'INT UNSIGNED'],
            [(object) ['type' => 'uint', 'length' => 2],    'INT(2) UNSIGNED'],
        ] as $i => [$asObj, $expected]) {
            $testFieldName = "fieldName{$i}";
            $field = new FieldDef($testFieldName, '', $asObj, null, null, null);
            $this->assertEquals("`$testFieldName` $expected" , $field->toSqlTableField());
        }
    }
}
