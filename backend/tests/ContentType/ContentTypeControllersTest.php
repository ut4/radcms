<?php

namespace RadCms\Tests\ContentType;

use Pike\{ArrayUtils, Request};
use Pike\TestUtils\{DbTestCase, HttpTestUtils};
use RadCms\Auth\ACL;
use RadCms\ContentType\{ContentTypeCollection, ContentTypeMigrator, ContentTypeValidator};
use RadCms\Tests\_Internal\{ContentTestUtils};

final class ContentTypeControllersTest extends DbTestCase {
    use HttpTestUtils;
    use ContentTestUtils;
    private static $testContentTypes;
    private static $migrator;
    private const DEFAULT_WIDGET = ContentTypeValidator::FIELD_WIDGETS[0];
    public static function setUpBeforeClass(): void {
        self::$testContentTypes = ContentTypeCollection::build()
        ->add('Events', 'Tapahtumat')->description('Kuvaus1')
            ->field('name')
            ->field('pic', 'Kuva')->widget('imagePicker')->defaultValue('default.jpg')
        ->add('Locations', 'Paikat')->description('Kuvaus2')
            ->field('name', 'Tapahtumapaikka')
            ->visibility(ACL::ROLE_SUPER_ADMIN)
        ->done();
        self::$migrator = new ContentTypeMigrator(self::getDb());
        // @allow \Pike\PikeException
        self::$migrator->installMany(self::$testContentTypes);
    }
    public static function tearDownAfterClass(): void {
        parent::tearDownAfterClass();
        // @allow \Pike\PikeException
        self::$migrator->uninstallMany(self::$testContentTypes);
        self::clearInstalledContentTypesFromDb(false);
    }
    public function testGETContentTypeReturnsContentType() {
        $s = $this->setupGetContentTypeTest();
        $this->sendGetContentTypeRequest($s);
        $expected = self::$testContentTypes[0];
        $this->verifyResponseBodyEquals(
            ['name' => $expected->name,
             'friendlyName' => $expected->friendlyName,
             'description' => $expected->description,
             'isInternal' => false,
             'index' => 0,
             'origin' => 'Website',
             'fields' => [
                 ['name' => 'name', 'friendlyName' => 'name',
                  'dataType' => self::makeDataType('text'),
                  'widget' => (object) ['name' => self::DEFAULT_WIDGET, 'args' => null],
                  'defaultValue' => '', 'visibility' => 0],
                 ['name' => 'pic', 'friendlyName' => 'Kuva',
                  'dataType' => self::makeDataType('text'),
                  'widget' => (object) ['name' => 'imagePicker', 'args' => null],
                  'defaultValue' => 'default.jpg', 'visibility' => 0],
             ]],
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
        $res = $this->createBodyCapturingMockResponse($s);
        $app = $this->makeTestApp();
        $this->sendRequest($req, $res, $app, $s);
    }


    ////////////////////////////////////////////////////////////////////////////


    public function testGETContentTypesReturnsAllContentTypes() {
        $s = $this->setupGetContentTypesTest();
        $this->sendGetContentTypesRequest($s);
        $this->verifyResponseBodyEquals(
            [['name' => self::$testContentTypes[0]->name,
              'friendlyName' => self::$testContentTypes[0]->friendlyName,
              'description' => self::$testContentTypes[0]->description,
              'isInternal' => false, 'index' => 0, 'origin' => 'Website', 'fields' => [
                ['name' => 'name', 'friendlyName' => 'name',
                 'dataType' => self::makeDataType('text'),
                 'widget' => (object) ['name' => self::DEFAULT_WIDGET, 'args' => null],
                 'defaultValue' => '', 'visibility' => 0],
                ['name' => 'pic', 'friendlyName' => 'Kuva',
                 'dataType' => self::makeDataType('text'),
                 'widget' => (object) ['name' => 'imagePicker', 'args' => null],
                 'defaultValue' => 'default.jpg', 'visibility' => 0],
            ]],
            ['name' => self::$testContentTypes[1]->name,
             'friendlyName' => self::$testContentTypes[1]->friendlyName,
             'description' => self::$testContentTypes[1]->description,
             'isInternal' => false, 'index' => 1, 'origin' => 'Website', 'fields' => [
                ['name' => 'name', 'friendlyName' => 'Tapahtumapaikka',
                 'dataType' => self::makeDataType('text'),
                 'widget' => (object) ['name' => self::DEFAULT_WIDGET, 'args' => null],
                 'defaultValue' => '', 'visibility' => 1],
            ]]],
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


    public function testPUTReorderFieldsSavesNewOrderOfContentTypeFields() {
        $s = $this->setupReorderFieldsTest();
        $this->installTestContentType($s);
        //
        $this->sendUpdateRequest($s, '/reorder-fields');
        $this->verifyUpdatedContentTypeFieldsOrder($s);
        //
        $this->uninstallTestContentType($s);
    }
    private function setupReorderFieldsTest() {
        return (object) [
            'contentTypeName' => 'Another',
            'reqBody' => (object) ['fields' => [
                (object) ['name' => 'field2',],
                (object) ['name' => 'field1',],
            ]],
            'testContentTypes' => new ContentTypeCollection()
        ];
    }
    private function verifyUpdatedContentTypeFieldsOrder($s) {
        $parsed = $this->getInternalInstalledContentTypes();
        $actualCompactCtype = $this->findEntryFromInternalContentTypes($s->contentTypeName,
                                                                       $parsed);
        $this->assertNotNull($actualCompactCtype);
        $this->assertEquals($s->reqBody->fields[0]->name, $actualCompactCtype->fields[0]->name);
        $this->assertEquals($s->reqBody->fields[1]->name, $actualCompactCtype->fields[1]->name);
        $this->verifyContentTypeTableExists($s->contentTypeName, true);
    }


    ////////////////////////////////////////////////////////////////////////////


    public function testPUTContentTypesUpdatesBasicInfoOfContentType() {
        $s = $this->setupUpdateTest();
        $this->installTestContentType($s);
        //
        $this->sendUpdateRequest($s);
        $this->verifyUpdatedContentType($s);
        //
        $this->uninstallTestContentType($s);
    }
    private function setupUpdateTest() {
        return (object) [
            'contentTypeName' => 'Another',
            'reqBody' => (object) [
                'name' => 'Another',
                'friendlyName' => 'Päivitetty selkonimi',
                'description' => 'Päivitetty kuvaus',
                'isInternal' => true,
            ],
            'testContentTypes' => new ContentTypeCollection()
        ];
    }
    private function sendUpdateRequest($s, $url = '') {
        $req = new Request("/api/content-types/{$s->contentTypeName}{$url}",
                           'PUT',
                           $s->reqBody);
        $res = $this->createMockResponse(['ok' => 'ok']);
        $app = $this->makeTestApp();
        $this->sendRequest($req, $res, $app);
    }
    private function verifyUpdatedContentType($s, $newName = null) {
        $parsed = $this->getInternalInstalledContentTypes();
        $actualCompactCtype = $this->findEntryFromInternalContentTypes($s->reqBody->name,
                                                                       $parsed);
        $this->assertNotNull($actualCompactCtype);
        $this->assertEquals($s->reqBody->friendlyName, $actualCompactCtype->friendlyName);
        $this->assertEquals($s->reqBody->description, $actualCompactCtype->description);
        if (!$newName)
            $this->verifyContentTypeTableExists($s->contentTypeName, true);
        else {
            $this->verifyContentTypeTableExists($s->contentTypeName, false);
            $this->verifyContentTypeTableExists($newName, true);
        }
    }


    ////////////////////////////////////////////////////////////////////////////


    public function testPUTContentTypesRenamesContentType() {
        $s = $this->setupUpdateTest();
        $this->installTestContentType($s);
        //
        $s->reqBody->name = "Updated{$s->contentTypeName}";
        $this->sendUpdateRequest($s);
        $this->verifyUpdatedContentType($s, $s->reqBody->name);
        //
        $s->testContentTypes[0]->name = $s->reqBody->name;
        $this->uninstallTestContentType($s);
    }


    ////////////////////////////////////////////////////////////////////////////


    public function testDELETEContentTypesDeletesContentType() {
        $s = $this->setupDeleteTest();
        $this->installTestContentType($s);
        $this->verifyContentTypeTableExists($s->contentTypeName, true);
        //
        $this->sendDeleteContentTypeRequest($s);
        $this->verifyDeletedContentType($s);
    }
    private function setupDeleteTest() {
        return (object) [
            'contentTypeName' => 'Another',
            'testContentTypes' => new ContentTypeCollection()
        ];
    }
    private function sendDeleteContentTypeRequest($s) {
        $req = new Request("/api/content-types/{$s->contentTypeName}", 'DELETE');
        $res = $this->createMockResponse(['ok' => 'ok']);
        $app = $this->makeTestApp();
        $this->sendRequest($req, $res, $app);
    }
    private function verifyDeletedContentType($s) {
        $compactCtypes = $this->getInternalInstalledContentTypes();
        $this->assertNull($this->findEntryFromInternalContentTypes($s->contentTypeName,
                                                                   $compactCtypes));
        $this->verifyContentTypeTableExists($s->contentTypeName, false);
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
            'contentTypeName' => 'Another',
            'reqBody' => (object) [
                'name' => 'newField',
                'dataType' => self::makeDataType('text'),
                'friendlyName' => 'Uusi kenttä',
                'isInternal' => false,
                'defaultValue' => '',
                'visibility' => 0,
                'widget' => (object) ['name' => 'textField', 'args' => null]
            ],
            'testContentTypes' => new ContentTypeCollection()
        ];
    }
    private function sendAddFieldToContentTypeRequest($s) {
        $req = new Request("/api/content-types/field/{$s->contentTypeName}",
                           'POST',
                           $s->reqBody);
        $res = $this->createMockResponse(['ok' => 'ok']);
        $app = $this->makeTestApp();
        $this->sendRequest($req, $res, $app);
    }
    private function verifyContentTypeFieldExist($s, $expectedField, $shouldExist) {
        $info = self::$db->fetchOne(
            'SELECT COLUMN_NAME, COLUMN_TYPE FROM INFORMATION_SCHEMA.COLUMNS' .
            ' WHERE TABLE_SCHEMA = ? AND TABLE_NAME = ? AND COLUMN_NAME = ?',
            [self::$db->getCurrentDatabaseName(),
             self::$db->getTablePrefix() . $s->contentTypeName,
             $expectedField->name]
        );
        if ($shouldExist) {
            $this->assertIsArray($info);
            $this->assertEquals($expectedField->dataType->type, $info['COLUMN_TYPE']);
        } else {
            $this->assertIsNotArray($info);
        }
    }
    private function verifyAddedFieldToContentTypeTable($s) {
        $this->verifyContentTypeFieldExist($s, $s->reqBody, true);
    }
    private function verifyAddedFieldToInternalTable($s) {
        $fieldData = $s->reqBody;
        $parsed = $this->getInternalInstalledContentTypes();
        $actualCompactCtype = $this->findEntryFromInternalContentTypes($s->contentTypeName,
                                                                       $parsed);
        $this->assertNotNull($actualCompactCtype);
        $actualNewField = ArrayUtils::findByKey($actualCompactCtype->fields,
                                                $fieldData->name,
                                                'name');
        $this->assertNotNull($actualNewField);
        $this->assertEquals($fieldData->dataType, $actualNewField->dataType);
        $this->assertEquals($fieldData->friendlyName, $actualNewField->friendlyName);
        $this->assertEquals($fieldData->widget->name, $actualNewField->widget->name);
        $this->assertEquals($fieldData->defaultValue, $actualNewField->defaultValue);
        $this->assertEquals($fieldData->visibility, $actualNewField->visibility);
    }


    ////////////////////////////////////////////////////////////////////////////


    public function testDELETEContentTypesFieldDeletesFieldFromContentType() {
        $s = $this->setupDeleteFieldTest();
        $this->installTestContentType($s);
        //
        $this->sendDeleteFieldFromContentTypeRequest($s);
        $this->verifyDeletedFieldFromContentTypeTable($s);
        $this->verifyDeletedFieldFromInternalTable($s);
        //
        $this->uninstallTestContentType($s);
    }
    private function setupDeleteFieldTest() {
        return (object) [
            'contentTypeName' => 'Another',
            'fieldName' => 'field1',
            'testContentTypes' => new ContentTypeCollection()
        ];
    }
    private function sendDeleteFieldFromContentTypeRequest($s) {
        $req = new Request("/api/content-types/field/{$s->contentTypeName}/{$s->fieldName}",
                           'DELETE');
        $res = $this->createMockResponse(['ok' => 'ok']);
        $app = $this->makeTestApp();
        $this->sendRequest($req, $res, $app, $s);
    }
    private function verifyDeletedFieldFromContentTypeTable($s) {
        $this->verifyContentTypeFieldExist($s,
                                           (object) ['name' => $s->fieldName],
                                           false);
    }
    private function verifyDeletedFieldFromInternalTable($s) {
        $parsed = $this->getInternalInstalledContentTypes();
        $actualCompactCtype = $this->findEntryFromInternalContentTypes($s->contentTypeName,
                                                                       $parsed);
        $this->assertNotNull($actualCompactCtype);
        $this->assertNull(ArrayUtils::findByKey($actualCompactCtype->fields,
                                                $s->fieldName,
                                                'name'));
    }
    private function installTestContentType($s) {
        $s->testContentTypes->add($s->contentTypeName,
                                  "Friendly name of {$s->contentTypeName}",
                                  'Kuvaus',
                                  [
                                      (object) ['name' => 'field1', 'dataType' => self::makeDataType('text')],
                                      (object) ['name' => 'field2', 'dataType' => self::makeDataType('int')],
                                  ]);
        // @allow \Pike\PikeException
        self::$migrator->installMany($s->testContentTypes);
    }
    private function uninstallTestContentType($s) {
        // @allow \Pike\PikeException
        self::$migrator->uninstallMany($s->testContentTypes);
    }
    private function getInternalInstalledContentTypes() {
        $row = self::$db->fetchOne('SELECT `installedContentTypes` FROM ${p}cmsState');
        $this->assertNotNull($row);
        $parsed = json_decode($row['installedContentTypes']);
        $this->assertIsArray($parsed);
        return $parsed;
    }
    private function findEntryFromInternalContentTypes($name, $internal) {
        return ArrayUtils::findByKey($internal, $name, 'name');
    }
    private function makeTestApp() {
        return $this->makeApp('\RadCms\App::create',
                              $this->getAppConfig(),
                              '\RadCms\AppContext');
    }
    private static function makeDataType(string $type, ?int $length = null): \stdClass {
        return (object) ['type' => $type, 'length' => $length];
    }
}
