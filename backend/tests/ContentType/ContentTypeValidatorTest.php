<?php

namespace RadCms\Tests\ContentType;

use PHPUnit\Framework\TestCase;
use RadCms\ContentType\{ContentTypeDef, ContentTypeValidator};

final class ContentTypeValidatorsTest extends TestCase {
    public function testValidateReturnsErrorMessages() {
        $ctype = ContentTypeDef::fromObject((object) [
            'fields' => [
                (object) ['dataType' => (object) ['type' => 'not-valid-data-type-name',
                                                  'length' => null],
                          'widget' => (object) ['name' => 'not-valid-widget-name',
                                                'args' => 'not-an-object']],
            ]
        ]);
        $errors = ContentTypeValidator::validate($ctype);
        $this->assertEquals([
            'name must contain only [a-zA-Z0-9_] and start with [a-zA-Z_]',
            'The length of friendlyName must be at least 1',
            'fields.0.name must contain only [a-zA-Z0-9_] and start with [a-zA-Z_]',
            'The length of fields.0.friendlyName must be at least 1',
            'The value of fields.0.dataType.type was not in the list',
            'The value of fields.0.widget.name was not in the list',
            'fields.0.widget.args must be object',
        ], $errors);
    }
}
