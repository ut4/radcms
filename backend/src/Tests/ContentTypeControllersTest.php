<?php

namespace RadCms\Tests;

use RadCms\Tests\Self\DbTestCase;
use RadCms\Tests\Self\HttpTestUtils;
use RadCms\Framework\Request;
use RadCms\ContentType\ContentTypeCollection;
use RadCms\ContentType\ContentTypeMigrator;
use RadCms\Tests\Self\MutedResponse;

final class ContentTypeControllersTest extends DbTestCase {
    use HttpTestUtils;
    private static $testContentTypes;
    private static $migrator;
    public static function setUpBeforeClass() {
        self::$testContentTypes = new ContentTypeCollection();
        self::$testContentTypes->add('Events', 'Tapahtumat',
                                     ['name' => 'text', 'pic' => 'text:image']);
        self::$testContentTypes->add('Locations', 'Paikat', ['name' => 'text']);
        self::$migrator = new ContentTypeMigrator(self::getDb());
        // @allow \RadCms\Common\RadException
        self::$migrator->installMany(self::$testContentTypes);
    }
    public static function tearDownAfterClass($_ = null) {
        parent::tearDownAfterClass($_);
        // @allow \RadCms\Common\RadException
        self::$migrator->uninstallMany(self::$testContentTypes);
    }
    public function testGETContentTypeReturnsContentType() {
        $s = $this->setupTest1();
        $this->setExpectedResponseBody('{"name":"Events"' .
            ',"friendlyName":"Tapahtumat","fields":' .
                '[{"dataType":"text","widget":null,"name":"name"}' .
                ',{"dataType":"text","widget":"image","name":"pic"}]' .
            ',"origin":"site.ini"' .
        '}', $s);
        $this->sendGetContentTypeRequest($s);
    }
    private function setupTest1() {
        return (object)[
            'contentTypeName' => 'Events',
            'expectedResponseBody' => null,
        ];
    }
    private function setExpectedResponseBody($expectedJson, $s) {
        $s->expectedResponseBody = $this->callback(
            function ($actualData) use ($expectedJson) {
                return json_encode($actualData) == $expectedJson;
            });
    }
    private function sendGetContentTypeRequest($s) {
        $res = $this->createMock(MutedResponse::class);
        $res->expects($this->once())
            ->method('json')
            ->with($s->expectedResponseBody)
            ->willReturn($res);
        $req = new Request('/api/content-types/' . $s->contentTypeName, 'GET');
        $this->makeRequest($req, $res);
    }
}
