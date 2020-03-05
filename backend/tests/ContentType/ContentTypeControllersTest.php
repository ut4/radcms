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
            'friendlyName must be string',
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
        $app = $this->makeApp('\RadCms\App::create', $this->getAppConfig());
        $this->sendResponseBodyCapturingRequest($req, $res, $app, $s);
    }


    ////////////////////////////////////////////////////////////////////////////


    public function testPOSTContentTypeFieldAddsFieldToContentType() {
        $s = $this->setupAddFieldTest();
        $this->installTestContentType($s);
        //
        $this->sendAddFieldToContentTypeRequest($s);
        $this->verifyAddedFieldToContentTypeTable($s);
        $this->verifyAddedFieldToInternalTable($s);
        //
        $this->uninstallTestContentType($s);
    }
    private function setupAddFieldTest() {
        return (object) [
            'contentTypeName' => 'ATest',
            'reqBody' => (object) [
                'name' => 'newField',
                'dataType' => 'text',
                'friendlyName' => 'Uusi kenttä',
                'isInternal' => false,
                'defaultValue' => '',
                'widget' => (object) ['name' => 'textField']
            ],
            'testContentTypes' => new ContentTypeCollection()
        ];
    }
    private function sendAddFieldToContentTypeRequest($s) {
        $req = new Request("/api/content-types/field/{$s->contentTypeName}",
                           'POST',
                           $s->reqBody);
        $res = $this->createMockResponse(['ok' => 'ok']);
        $app = $this->makeApp('\RadCms\App::create', $this->getAppConfig());
        $this->sendRequest($req, $res, $app);
    }
    private function verifyAddedFieldToContentTypeTable($s) {
        $fieldData = $s->reqBody;
        $info = self::$db->fetchOne(
            'SELECT COLUMN_NAME, COLUMN_TYPE FROM INFORMATION_SCHEMA.COLUMNS' .
            ' WHERE TABLE_SCHEMA = ? AND TABLE_NAME = ? AND COLUMN_NAME = ?',
            [self::$db->getCurrentDatabaseName(),
             self::$db->getTablePrefix() . $s->contentTypeName,
             $fieldData->name]
        );
        $this->assertNotNull($info);
        $this->assertEquals($fieldData->dataType, $info['COLUMN_TYPE']);
    }
    private function verifyAddedFieldToInternalTable($s) {
        $fieldData = $s->reqBody;
        $parsed = $this->getInternalInstalledContentTypesFromDb();
        $actualCompactCtype = $parsed->{$s->contentTypeName} ?? null;
        $this->assertNotNull($actualCompactCtype);
        $actualNewField = $actualCompactCtype[1]->{$fieldData->name} ?? null;
        $this->assertNotNull($actualNewField);
        $this->assertEquals($fieldData->dataType, $actualNewField[0]);
        $this->assertEquals($fieldData->friendlyName, $actualNewField[1]);
        $this->assertEquals($fieldData->widget->name, $actualNewField[2]);
        $this->assertEquals($fieldData->defaultValue, $actualNewField[3]);
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
             'origin' => 'Website'],
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
        $app = $this->makeApp('\RadCms\App::create', $this->getAppConfig());
        $this->sendResponseBodyCapturingRequest($req, $res, $app, $s);
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
            ], 'isInternal' => false, 'origin' => 'Website'],
            ['name' => 'Locations', 'friendlyName' => 'Paikat', 'fields' => [
                ['name' => 'name', 'friendlyName' => 'Tapahtumapaikka', 'dataType' => 'text',
                 'widget' => new FieldSetting(self::DEFAULT_WIDGET),
                 'defaultValue' => ''],
            ], 'isInternal' => false, 'origin' => 'Website']],
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


    ////////////////////////////////////////////////////////////////////////////


    public function testPUTContentTypesUpdatesBasicInfoOfContentType() {
        $s = $this->setupUpdateTest();
        $this->installTestContentType($s);
        //
        $this->sendUpdateContentTypeRequest($s);
        $this->verifyUpdatedBasicInfoToInternalTable($s);
        $this->verifyDidNotRenameContentTypeTable($s);
        //
        $this->uninstallTestContentType($s);
    }
    private function setupUpdateTest() {
        return (object) [
            'contentTypeName' => 'Another',
            'reqBody' => (object) [
                'name' => 'Another',
                'friendlyName' => 'Päivitetty selkonimi',
                'isInternal' => true,
            ],
            'testContentTypes' => new ContentTypeCollection()
        ];
    }
    private function sendUpdateContentTypeRequest($s) {
        $req = new Request("/api/content-types/{$s->contentTypeName}",
                           'PUT',
                           $s->reqBody);
        $res = $this->createMockResponse(['ok' => 'ok']);
        $app = $this->makeApp('\RadCms\App::create', $this->getAppConfig());
        $this->sendResponseBodyCapturingRequest($req, $res, $app, $s);
    }
    private function verifyUpdatedBasicInfoToInternalTable($s) {
        $parsed = $this->getInternalInstalledContentTypesFromDb();
        $actualCompactCtype = $parsed->{$s->reqBody->name . ':internal'} ?? null;
        $this->assertNotNull($actualCompactCtype);
        $this->assertEquals($s->reqBody->friendlyName, $actualCompactCtype[0]);
    }
    private function verifyDidNotRenameContentTypeTable($s) {
        $this->verifyContentTypeTableExists($s->contentTypeName, true);
    }


    ////////////////////////////////////////////////////////////////////////////


    public function testPUTContentTypesRenamesContentType() {
        $s = $this->setupUpdateTest();
        $this->installTestContentType($s);
        //
        $s->reqBody->name = "Updated{$s->contentTypeName}";
        $this->sendUpdateContentTypeRequest($s);
        $this->verifyUpdatedBasicInfoToInternalTable($s);
        $this->verifyRenamedContentTypeTable($s);
        //
        $s->testContentTypes[0]->name = $s->reqBody->name;
        $this->uninstallTestContentType($s);
    }
    private function verifyRenamedContentTypeTable($s) {
        $this->verifyContentTypeTableExists($s->contentTypeName, false);
        $this->verifyContentTypeTableExists($s->reqBody->name, true);
    }
    private function installTestContentType($s) {
        $s->testContentTypes->add($s->contentTypeName,
                                  "Friendly name of {$s->contentTypeName}",
                                  ['field1' => ['text']]);
        // @allow \Pike\PikeException
        self::$migrator->installMany($s->testContentTypes);
    }
    private function uninstallTestContentType($s) {
        // @allow \Pike\PikeException
        self::$migrator->uninstallMany($s->testContentTypes);
    }
    private function getInternalInstalledContentTypesFromDb() {
        $row = self::$db->fetchOne('SELECT `installedContentTypes` FROM ${p}cmsState');
        $this->assertNotNull($row);
        $parsed = json_decode($row['installedContentTypes']);
        $this->assertNotNull($parsed);
        return $parsed;
    }
}
