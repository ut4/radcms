<?php

namespace RadCms\Tests\ContentType;

use Pike\TestUtils\DbTestCase;
use Pike\TestUtils\HttpTestUtils;
use RadCms\Tests\Installer\InstallerTest;
use Pike\Request;
use RadCms\ContentType\ContentTypeCollection;
use RadCms\ContentType\ContentTypeMigrator;
use RadCms\ContentType\ContentTypeValidator;

final class ContentTypeControllersTest extends DbTestCase {
    use HttpTestUtils;
    private static $testContentTypes;
    private static $migrator;
    private const DEFAULT_WIDGET = ContentTypeValidator::FIELD_WIDGETS[0];
    public static function setUpBeforeClass() {
        self::$testContentTypes = new ContentTypeCollection();
        self::$testContentTypes->add('Events', 'Tapahtumat',
                                     ['name' => ['text'],
                                      'pic' => ['text', 'Kuva', 'image']]);
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
        InstallerTest::clearInstalledContentTypesFromDb();
    }
    public function testGETContentTypeReturnsContentType() {
        $s = $this->setupGetContentTypeTest();
        $this->sendGetContentTypeRequest($s);
        $this->verifyResponseBodyEquals(
            ['name' => 'Events',
             'friendlyName' => 'Tapahtumat',
             'fields' => [
                 ['name' => 'name', 'friendlyName' => 'name', 'dataType' => 'text',
                  'widget' => self::DEFAULT_WIDGET],
                 ['name' => 'pic', 'friendlyName' => 'Kuva', 'dataType' => 'text',
                  'widget' => 'image'],
             ],
             'origin' => 'site.json',
             'isInternal' => false],
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
        $req = new Request($url ?? '/api/content-types/' . $s->contentTypeName, 'GET');
        $this->sendResponseBodyCapturingRequest($req, '\RadCms\App::create', $s);
    }
    private function verifyResponseBodyEquals($expected, $s) {
        $this->assertEquals(json_encode($expected),
                            $s->actualResponseBody);
    }


    ////////////////////////////////////////////////////////////////////////////


    public function testGETContentTypesReturnsAllContentTypes() {
        $s = $this->setupGetContentTypesTest();
        $this->sendGetAllContentTypesRequest($s);
        $this->verifyResponseBodyEquals(
            [['name' => 'Events', 'friendlyName' => 'Tapahtumat', 'fields' => [
                ['name' => 'name', 'friendlyName' => 'name', 'dataType' => 'text',
                 'widget' => self::DEFAULT_WIDGET],
                ['name' => 'pic', 'friendlyName' => 'Kuva', 'dataType' => 'text',
                 'widget' => 'image'],
            ], 'origin' => 'site.json', 'isInternal' => false],
            ['name' => 'Locations', 'friendlyName' => 'Paikat', 'fields' => [
                ['name' => 'name', 'friendlyName' => 'Tapahtumapaikka', 'dataType' => 'text',
                 'widget' => self::DEFAULT_WIDGET],
            ], 'origin' => 'site.json', 'isInternal' => false]],
            $s
        );
    }
    private function setupGetContentTypesTest() {
        return (object)[
            'actualResponseBody' => null,
        ];
    }
    private function sendGetAllContentTypesRequest($s) {
        $this->sendGetContentTypeRequest($s, '/api/content-types');
    }
}
