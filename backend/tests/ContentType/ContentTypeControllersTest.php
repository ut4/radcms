<?php

namespace RadCms\Tests\ContentType;

use Pike\ArrayUtils;
use Pike\TestUtils\{DbTestCase, HttpTestUtils};
use RadCms\Auth\ACL;
use RadCms\ContentType\{ContentTypeCollection, ContentTypeMigrator, ContentTypeValidator};
use RadCms\Tests\_Internal\{ApiRequestFactory, ContentTestUtils};

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
        $this->verifyRespondedSuccesfullyWith(
            ['name' => $expected->name,
             'friendlyName' => $expected->friendlyName,
             'description' => $expected->description,
             'isInternal' => false,
             'frontendFormImpl' => 'Default',
             'index' => 0,
             'origin' => 'Website',
             'fields' => [
                 ['name' => 'name', 'friendlyName' => 'name',
                  'dataType' => self::makeDataType('text'),
                  'widget' => (object) ['name' => self::DEFAULT_WIDGET, 'args' => null],
                  'defaultValue' => '', 'visibility' => 0,
                  'validationRules' => null],
                 ['name' => 'pic', 'friendlyName' => 'Kuva',
                  'dataType' => self::makeDataType('text'),
                  'widget' => (object) ['name' => 'imagePicker', 'args' => null],
                  'defaultValue' => 'default.jpg', 'visibility' => 0,
                  'validationRules' => null],
             ]],
            $s
        );
    }
    private function setupGetContentTypeTest() {
        $state = new \stdClass;
        $state->contentTypeName = 'Events';
        $state->spyingResponse = null;
        return $state;
    }
    private function sendGetContentTypeRequest($s, $url = null) {
        $req = ApiRequestFactory::create($url ?? "/api/content-types/{$s->contentTypeName}", 'GET');
        $s->spyingResponse = $this->makeSpyingResponse();
        $app = $this->makeTestApp();
        $this->sendRequest($req, $s->spyingResponse, $app);
    }


    ////////////////////////////////////////////////////////////////////////////


    public function testGETContentTypesReturnsAllContentTypes() {
        $s = $this->setupGetContentTypesTest();
        $this->sendGetContentTypesRequest($s);
        $this->verifyRespondedSuccesfullyWith(
            [['name' => self::$testContentTypes[0]->name,
              'friendlyName' => self::$testContentTypes[0]->friendlyName,
              'description' => self::$testContentTypes[0]->description,
              'isInternal' => false, 'frontendFormImpl' => 'Default', 'index' => 0,
              'origin' => 'Website', 'fields' => [
                ['name' => 'name', 'friendlyName' => 'name',
                 'dataType' => self::makeDataType('text'),
                 'widget' => (object) ['name' => self::DEFAULT_WIDGET, 'args' => null],
                 'defaultValue' => '', 'visibility' => 0,
                  'validationRules' => null],
                ['name' => 'pic', 'friendlyName' => 'Kuva',
                 'dataType' => self::makeDataType('text'),
                 'widget' => (object) ['name' => 'imagePicker', 'args' => null],
                 'defaultValue' => 'default.jpg', 'visibility' => 0,
                 'validationRules' => null],
            ]],
            ['name' => self::$testContentTypes[1]->name,
             'friendlyName' => self::$testContentTypes[1]->friendlyName,
             'description' => self::$testContentTypes[1]->description,
             'isInternal' => false, 'frontendFormImpl' => 'Default', 'index' => 1,
             'origin' => 'Website', 'fields' => [
                ['name' => 'name', 'friendlyName' => 'Tapahtumapaikka',
                 'dataType' => self::makeDataType('text'),
                 'widget' => (object) ['name' => self::DEFAULT_WIDGET, 'args' => null],
                 'defaultValue' => '', 'visibility' => 1,
                 'validationRules' => null],
            ]]],
            $s
        );
    }
    private function setupGetContentTypesTest() {
        $state = new \stdClass;
        $state->spyingResponse = null;
        return $state;
    }
    private function sendGetContentTypesRequest($s) {
        $this->sendGetContentTypeRequest($s, '/api/content-types');
    }


    ////////////////////////////////////////////////////////////////////////////


    public function testPUTReorderFieldsSavesNewOrderOfContentTypeFields() {
        $s = $this->setupReorderFieldsTest();
        $this->installTestContentType($s);
        $this->sendUpdateRequest($s, '/reorder-fields');
        $this->verifyRespondedSuccesfullyWith(['ok' => 'ok'], $s);
        $this->verifyUpdatedContentTypeFieldsOrder($s);
        $this->uninstallTestContentType($s);
    }
    private function setupReorderFieldsTest() {
        $state = new \stdClass;
        $state->contentTypeName = 'Another';
        $state->reqBody = (object) ['fields' => [
            (object) ['name' => 'field2',],
            (object) ['name' => 'field1',],
        ]];
        $state->testContentTypes = new ContentTypeCollection();
        $state->spyingResponse = null;
        return $state;
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
        $this->sendUpdateRequest($s);
        $this->verifyRespondedSuccesfullyWith(['ok' => 'ok'], $s);
        $this->verifyUpdatedContentType($s);
        $this->uninstallTestContentType($s);
    }
    private function setupUpdateTest() {
        $state = $this->setupReorderFieldsTest();
        $state->reqBody = (object) [
            'name' => 'Another',
            'friendlyName' => 'Päivitetty selkonimi',
            'description' => 'Päivitetty kuvaus',
            'isInternal' => true,
            'frontendFormImpl' => 'MyFormImpl',
        ];
        $state->testContentTypes = new ContentTypeCollection();
        return $state;
    }
    private function sendUpdateRequest($s, $url = '') {
        $req = ApiRequestFactory::create("/api/content-types/{$s->contentTypeName}{$url}",
                                         'PUT',
                                         $s->reqBody);
        $s->spyingResponse = $this->makeSpyingResponse();
        $app = $this->makeTestApp();
        $this->sendRequest($req, $s->spyingResponse, $app);
    }
    private function verifyUpdatedContentType($s, $newName = null) {
        $parsed = $this->getInternalInstalledContentTypes();
        $actualCompactCtype = $this->findEntryFromInternalContentTypes($s->reqBody->name,
                                                                       $parsed);
        $this->assertNotNull($actualCompactCtype);
        $this->assertEquals($s->reqBody->friendlyName, $actualCompactCtype->friendlyName);
        $this->assertEquals($s->reqBody->description, $actualCompactCtype->description);
        $this->assertEquals($s->reqBody->frontendFormImpl, $actualCompactCtype->frontendFormImpl);
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
        $s->reqBody->name = "Updated{$s->contentTypeName}";
        $this->sendUpdateRequest($s);
        $this->verifyRespondedSuccesfullyWith(['ok' => 'ok'], $s);
        $this->verifyUpdatedContentType($s, $s->reqBody->name);
        $s->testContentTypes[0]->name = $s->reqBody->name;
        $this->uninstallTestContentType($s);
    }


    ////////////////////////////////////////////////////////////////////////////


    public function testDELETEContentTypesDeletesContentType() {
        $s = $this->setupDeleteTest();
        $this->installTestContentType($s);
        $this->verifyContentTypeTableExists($s->contentTypeName, true);
        $this->sendDeleteContentTypeRequest($s);
        $this->verifyRespondedSuccesfullyWith(['ok' => 'ok'], $s);
        $this->verifyDeletedContentType($s);
    }
    private function setupDeleteTest() {
        return $this->setupReorderFieldsTest();
    }
    private function sendDeleteContentTypeRequest($s) {
        $req = ApiRequestFactory::create("/api/content-types/{$s->contentTypeName}", 'DELETE');
        $s->spyingResponse = $this->makeSpyingResponse();
        $app = $this->makeTestApp();
        $this->sendRequest($req, $s->spyingResponse, $app);
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
        $this->sendAddFieldToContentTypeRequest($s);
        $this->verifyRespondedSuccesfullyWith(['ok' => 'ok'], $s);
        $this->verifyAddedFieldToContentTypeTable($s);
        $this->verifyAddedFieldToInternalTable($s);
        $this->uninstallTestContentType($s);
    }
    private function setupAddFieldTest() {
        $state = $this->setupReorderFieldsTest();
        $state->reqBody = (object) [
            'name' => 'newField',
            'dataType' => self::makeDataType('text'),
            'friendlyName' => 'Uusi kenttä',
            'isInternal' => false,
            'defaultValue' => '',
            'visibility' => 0,
            'widget' => (object) ['name' => 'textField', 'args' => null]
        ];
        return $state;
    }
    private function sendAddFieldToContentTypeRequest($s) {
        $req = ApiRequestFactory::create("/api/content-types/field/{$s->contentTypeName}",
                                         'POST',
                                         $s->reqBody);
        $s->spyingResponse = $this->makeSpyingResponse();
        $app = $this->makeTestApp();
        $this->sendRequest($req, $s->spyingResponse, $app);
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
        $this->sendDeleteFieldFromContentTypeRequest($s);
        $this->verifyRespondedSuccesfullyWith(['ok' => 'ok'], $s);
        $this->verifyDeletedFieldFromContentTypeTable($s);
        $this->verifyDeletedFieldFromInternalTable($s);
        $this->uninstallTestContentType($s);
    }
    private function setupDeleteFieldTest() {
        $state = $this->setupReorderFieldsTest();
        $state->fieldName = 'field1';
        return $state;
    }
    private function sendDeleteFieldFromContentTypeRequest($s) {
        $req = ApiRequestFactory::create("/api/content-types/field/{$s->contentTypeName}/{$s->fieldName}",
                                         'DELETE');
        $s->spyingResponse = $this->makeSpyingResponse();
        $app = $this->makeTestApp();
        $this->sendRequest($req, $s->spyingResponse, $app, $s);
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
    private function verifyRespondedSuccesfullyWith($expected, $s) {
        $this->verifyResponseMetaEquals(200, 'application/json', $s->spyingResponse);
        $this->verifyResponseBodyEquals($expected, $s->spyingResponse);
    }
}
