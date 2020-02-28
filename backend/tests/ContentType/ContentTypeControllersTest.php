<?php

namespace RadCms\Tests\ContentType;

use Pike\TestUtils\DbTestCase;
use Pike\TestUtils\HttpTestUtils;
use RadCms\Tests\_Internal\ContentTestUtils;
use Pike\Request;
use Pike\Response;
use RadCms\ContentType\ContentTypeCollection;
use RadCms\ContentType\ContentTypeMigrator;
use RadCms\ContentType\ContentTypeValidator;
use RadCms\ContentType\FieldSetting;

final class ContentTypeControllersTest extends DbTestCase {
    use HttpTestUtils;
    use ContentTestUtils;
    private static $testContentTypes;
    private static $migrator;
    private const DEFAULT_WIDGET = ContentTypeValidator::FIELD_WIDGETS[0];
    private $app;
    public static function setUpBeforeClass() {
        self::$testContentTypes = new ContentTypeCollection();
        self::$testContentTypes->add('Events', 'Tapahtumat',
                                     ['name' => ['text'],
                                      'pic' => ['text', 'Kuva', 'image', 'default.jpg']]);
        self::$testContentTypes->add('Locations', 'Paikat',
                                     ['name' => ['text', 'Tapahtumapaikka']]);
        self::$migrator = new ContentTypeMigrator(self::getDb());
        // @allow \Pike\PikeException
        self::$migrator->installMany(self::$testContentTypes);
    }
    public static function tearDownAfterClass() {
        parent::tearDownAfterClass();
        // @allow \Pike\PikeException
        self::$migrator->uninstallMany(self::$testContentTypes);
        self::clearInstalledContentTypesFromDb();
    }
    protected function setUp() {
        parent::setUp();
        $this->app = $this->makeApp('\RadCms\App::create', $this->getAppConfig());
    }
    public function testPOSTContentTypeValidatesInputData() {
        $s = $this->setupValidationTest((object)[
            'name' => 'not-valid-identifier%&#',
            'friendlyName' => new \stdClass,
            'isInternal' => new \stdClass,
            // ei kenttiä
        ]);
        $this->sendCreateContentTypeRequest($s);
        $this->verifyResponseBodyEquals([
            'name must contain only [a-zA-Z0-9_] and start with [a-zA-Z_]',
            'The length of friendlyName must be at least 1',
            'isInternal must be bool',
            'fields.*.name must contain only [a-zA-Z0-9_] and start with [a-zA-Z_]',
            'The length of fields.*.friendlyName must be at least 1',
            'The value of fields.*.dataType was not in the list',
            'fields.*.defaultValue must be string',
            'The value of fields.*.widget.name was not in the list',
        ], $s);
    }
    private function setupValidationTest($reqBody) {
        return (object)[
            'reqBody' => $reqBody,
            'actualResponseBody' => null
        ];
    }
    private function sendCreateContentTypeRequest($s) {
        $req = new Request('/api/content-types', 'POST', $s->reqBody);
        $res = $this->createMockResponse(null, 400);
        $this->sendResponseBodyCapturingRequest($req, $res, $this->app, $s);
    }

    ////////////////////////////////////////////////////////////////////////////

    public function testGETContentTypeReturnsContentType() {
        $s = $this->setupGetContentTypeTest();
        $this->sendGetContentTypeRequest($s);
        $this->verifyResponseBodyEquals(
            ['name' => 'Events',
             'friendlyName' => 'Tapahtumat',
             'fields' => [
                 ['name' => 'name', 'friendlyName' => 'name', 'dataType' => 'text',
                  'widget' => new FieldSetting(self::DEFAULT_WIDGET),
                  'defaultValue' => ''],
                 ['name' => 'pic', 'friendlyName' => 'Kuva', 'dataType' => 'text',
                  'widget' => new FieldSetting('image'),
                  'defaultValue' => 'default.jpg'],
             ],
             'isInternal' => false,
             'origin' => 'site.json'],
            $s
        );
    }
    private function setupGetContentTypeTest() {
        return (object)[
            'contentTypeName' => 'Events',
            'actualResponseBody' => null,
        ];
    }
    private function sendGetContentTypeRequest($s, $url = null) {
        $req = new Request($url ?? "/api/content-types/{$s->contentTypeName}", 'GET');
        $res = $this->createMock(Response::class);
        $this->sendResponseBodyCapturingRequest($req, $res, $this->app, $s);
    }
    private function verifyResponseBodyEquals($expected, $s) {
        $this->assertEquals(json_encode($expected),
                            $s->actualResponseBody);
    }


    ////////////////////////////////////////////////////////////////////////////


    public function testGETContentTypesReturnsAllContentTypes() {
        $s = $this->setupGetContentTypesTest();
        $this->sendGetContentTypesRequest($s);
        $this->verifyResponseBodyEquals(
            [['name' => 'Events', 'friendlyName' => 'Tapahtumat', 'fields' => [
                ['name' => 'name', 'friendlyName' => 'name', 'dataType' => 'text',
                 'widget' => new FieldSetting(self::DEFAULT_WIDGET),
                 'defaultValue' => ''],
                ['name' => 'pic', 'friendlyName' => 'Kuva', 'dataType' => 'text',
                 'widget' => new FieldSetting('image'),
                 'defaultValue' => 'default.jpg'],
            ], 'isInternal' => false, 'origin' => 'site.json'],
            ['name' => 'Locations', 'friendlyName' => 'Paikat', 'fields' => [
                ['name' => 'name', 'friendlyName' => 'Tapahtumapaikka', 'dataType' => 'text',
                 'widget' => new FieldSetting(self::DEFAULT_WIDGET),
                 'defaultValue' => ''],
            ], 'isInternal' => false, 'origin' => 'site.json']],
            $s
        );
    }
    private function setupGetContentTypesTest() {
        return (object)[
            'actualResponseBody' => null,
        ];
    }
    private function sendGetContentTypesRequest($s) {
        $this->sendGetContentTypeRequest($s, '/api/content-types');
    }
}
