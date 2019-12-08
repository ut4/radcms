<?php

namespace RadCms\Tests\ContentType;

use RadCms\Tests\_Internal\DbTestCase;
use RadCms\Tests\_Internal\HttpTestUtils;
use RadCms\Tests\Installer\InstallerTest;
use RadCms\Framework\Request;
use RadCms\ContentType\ContentTypeCollection;
use RadCms\ContentType\ContentTypeMigrator;

final class ContentTypeControllersTest extends DbTestCase {
    use HttpTestUtils;
    private static $testContentTypes;
    private static $migrator;
    public static function setUpBeforeClass() {
        self::$testContentTypes = new ContentTypeCollection();
        self::$testContentTypes->add('Events', 'Tapahtumat',
                                     ['name' => ['text'],
                                      'pic' => ['text', 'Kuva', 'image']]);
        self::$testContentTypes->add('Locations', 'Paikat',
                                     ['name' => ['text', 'Tapahtumapaikka']]);
        self::$migrator = new ContentTypeMigrator(self::getDb());
        // @allow \RadCms\Common\RadException
        self::$migrator->installMany(self::$testContentTypes);
    }
    public static function tearDownAfterClass($_ = null) {
        parent::tearDownAfterClass($_);
        // @allow \RadCms\Common\RadException
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
                 ['name' => 'name', 'friendlyName' => 'name', 'dataType' => 'text', 'widget' => null],
                 ['name' => 'pic', 'friendlyName' => 'Kuva', 'dataType' => 'text', 'widget' => 'image'],
             ],
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
        $req = new Request($url ?? '/api/content-types/' . $s->contentTypeName, 'GET');
        $this->sendResponseBodyCapturingRequest($req, $s);
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
                ['name' => 'name', 'friendlyName' => 'name', 'dataType' => 'text', 'widget' => null],
                ['name' => 'pic', 'friendlyName' => 'Kuva', 'dataType' => 'text', 'widget' => 'image'],
            ], 'origin' => 'site.json'],
            ['name' => 'Locations', 'friendlyName' => 'Paikat', 'fields' => [
                ['name' => 'name', 'friendlyName' => 'Tapahtumapaikka', 'dataType' => 'text', 'widget' => null],
            ], 'origin' => 'site.json']],
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
