<?php

declare(strict_types=1);

namespace RadCms\ContentType;

use Pike\Db;
use Pike\PikeException;
use Pike\ArrayUtils;
use RadCms\Content\DAO;
use RadCms\Content\DMO;
use RadCms\Plugin\Plugin;

/**
 * Luokka joka asentaa/päivittää/poistaa sisältötyyppejä ja sen sisältämiä
 * kenttiä tietokantaan.
 */
class ContentTypeMigrator {
    private $db;
    private $origin;
    /**
     * @param \Pike\Db $db
     */
    public function __construct(Db $db) {
        $this->db = $db;
        $this->origin = 'Website';
    }
    /**
     * @param object $data Validoitu $req->body
     */
    public function installSingle(\stdClass $data): bool {
        $contentTypes = new ContentTypeCollection;
        $contentTypes->add($data->name,
                           $data->friendlyName,
                           $data->fields,
                           $data->isInternal);
        // @allow \Pike\PikeException
        return $this->installMany($contentTypes);
    }
    /**
     * @param \RadCms\ContentType\ContentTypeCollection $contentTypes
     * @param string $size = 'medium' 'tiny' | 'small' | 'medium' | '' | 'big'
     * @param array $initialData = null [['ContentTypeName', [(object)['key' => 'value']...]]...]
     * @return bool
     * @throws \Pike\PikeException
     */
    public function installMany(ContentTypeCollection $contentTypes,
                                array $initialData = null,
                                string $size = 'medium'): bool {
        if (!in_array($size, ContentTypeValidator::COLLECTION_SIZES)) {
            throw new PikeException('Not valid content type collection size ' .
                                    implode(' | ', ContentTypeValidator::COLLECTION_SIZES),
                                    PikeException::BAD_INPUT);
        }
        // @allow \Pike\PikeException
        return $this->validateContentTypes($contentTypes) &&
               self::validateInitialData($initialData) &&
               $this->createContentTypes($contentTypes, $size) &&
               $this->addToInstalledContentTypes($contentTypes) &&
               $this->insertInitialData($initialData, $contentTypes);
    }
    /**
     * @param \stdClass $data {name: string, friendlyName: string, isInternal: bool} Olettaa että on validi
     * @param \RadCms\ContentType\ContentTypeDef $contentType
     * @return bool
     * @throws \Pike\PikeException
     */
    public function updateSingle(\stdClass $data,
                                 ContentTypeDef $contentType,
                                 ContentTypeCollection $currentContentTypes): bool {
        if ($data->name !== $contentType->name) {
            // @allow \Pike\PikeException
            $this->db->exec('RENAME TABLE `${p}' . $contentType->name .
                            '` TO `${p}' . $data->name . '`');
        }
        if ($data->name !== $contentType->name ||
            $data->friendlyName !== $contentType->friendlyName ||
            $data->isInternal !== $contentType->isInternal) {
            $idx = $contentType->index;
            $currentContentTypes[$idx]->name = $data->name;
            $currentContentTypes[$idx]->friendlyName = $data->friendlyName;
            $currentContentTypes[$idx]->isInternal = $data->isInternal;
            // @allow \Pike\PikeException
            if ($this->db->exec(
                'UPDATE ${p}cmsState SET'.
                ' `installedContentTypes` = JSON_UNQUOTE(?)' .
                ', `installedContentTypesLastUpdated` = UNIX_TIMESTAMP()',
                [json_encode($currentContentTypes->toCompactForm())]) !== 1)
                throw new PikeException('Failed to rewrite cmsState.`installedContentTypes`',
                                        PikeException::INEFFECTUAL_DB_OP);
        }
        return true;
    }
    /**
     * @param \RadCms\ContentType\ContentTypeCollection $contentTypes
     * @return bool
     * @throws \Pike\PikeException
     */
    public function uninstallMany(ContentTypeCollection $contentTypes): bool {
        // @allow \Pike\PikeException
        return $this->validateContentTypes($contentTypes) &&
               $this->removeContentTypes($contentTypes) &&
               $this->removeFromInstalledContentTypes($contentTypes);
    }
    /**
     * @param \RadCms\ContentType\ContentTypeDef $contentType
     * @return bool
     * @throws \Pike\PikeException
     */
    public function uninstallSingle(ContentTypeDef $contentType): bool {
        $contentTypes = new ContentTypeCollection([$contentType]);
        // @allow \Pike\PikeException
        return $this->uninstallMany($contentTypes);
    }
    /**
     * @param \RadCms\ContentType\FieldDef $field Olettaa, että validi
     * @param \RadCms\ContentType\ContentTypeDef $contentType
     * @return bool
     * @throws \Pike\PikeException
     */
    public function addField(FieldDef $field, ContentTypeDef $contentType): bool {
        // @allow \Pike\PikeException
        $this->validateContentType($contentType);
        // @allow \Pike\PikeException
        $this->db->exec('ALTER TABLE `${p}' . $contentType->name . '`' .
                        ' ADD COLUMN ' . $field->toSqlTableField());
        //
        $contentType->fields[] = $field;
        // @allow \Pike\PikeException
        $this->updateInstalledContenType($contentType);
        return true;
    }
    /**
     * @param \RadCms\ContentType\FieldDef $newData
     * @param \RadCms\ContentType\FieldDef $currentField
     * @param \RadCms\ContentType\ContentTypeDef $contentType
     * @return bool
     * @throws \Pike\PikeException
     */
    public function updateField(FieldDef $newData,
                                FieldDef $currentField,
                                ContentTypeDef $contentType): bool {
        // @allow \Pike\PikeException
        $this->validateContentType($contentType);
        // @allow \Pike\PikeException
        if ($newData->name !== $currentField->name ||
            $newData->dataType !== $currentField->dataType)
            $this->db->exec(
                'ALTER TABLE `${p}' . $contentType->name . '`' .
                (($newData->name === $currentField->name)
                    ? ' MODIFY ' . $newData->toSqlTableField()
                    : ' CHANGE `' . $currentField->name . '` ' .
                        $newData->toSqlTableField())
            );
        //
        $idx = ArrayUtils::findIndexByKey($contentType->fields,
                                            $currentField->name,
                                            'name');
        $contentType->fields[$idx] = $newData;
        // @allow \Pike\PikeException
        $this->updateInstalledContenType($contentType);
        //
        return true;
    }
    /**
     * @param \RadCms\ContentType\FieldDef $field Olettaa, että validi
     * @param \RadCms\ContentType\ContentTypeDef $contentType
     * @return bool
     * @throws \Pike\PikeException
     */
    public function removeField(FieldDef $field, ContentTypeDef $contentType): bool {
        // @allow \Pike\PikeException
        $this->validateContentType($contentType);
        // @allow \Pike\PikeException
        $this->db->exec('ALTER TABLE `${p}' . $contentType->name . '`' .
                        ' DROP COLUMN `' . $field->name . '`');
        //
        $idx = ArrayUtils::findIndexByKey($contentType->fields,
                                            $field->name,
                                            'name');
        $contentType->fields->offsetUnset($idx);
        // @allow \Pike\PikeException
        $this->updateInstalledContenType($contentType);
        return true;
    }
    /**
     * @param \RadCms\Plugin\Plugin $plugin
     */
    public function setOrigin(Plugin $plugin): void {
        $this->origin = $plugin->name;
    }
    /**
     * @param array[mixed[]]|null $data [['ContentTypeName', [(object)['key' => 'value']...]]...]
     * @return bool
     * @throws \Pike\PikeException
     */
    public static function validateInitialData(?array $data): bool {
        if (!$data)
            return true;
        foreach ($data as $item) {
            if (!is_array($item) ||
                count($item) !== 2 ||
                !is_string($item[0]) ||
                !is_array($item[1]) ||
                (count($item[1]) && !($item[1][0] instanceof \stdClass)))
                    throw new PikeException(
                        'initialData entry must be [["ContentTypeName", [{"key":"value"}]]]',
                        PikeException::BAD_INPUT);
        }
        return true;
    }
    /**
     * @param \RadCms\ContentType\ContentTypeCollection $contentTypes
     * @return bool
     * @throws \Pike\PikeException
     */
    private function validateContentTypes(ContentTypeCollection $contentTypes): bool {
        if (!($errors = ContentTypeValidator::validateAll($contentTypes)))
            return true;
        throw new PikeException('Got invalid content types: '. implode(',', $errors),
                                PikeException::BAD_INPUT);
    }
    /**
     * @param \RadCms\ContentType\ContentTypeDef $contentType
     * @return bool
     * @throws \Pike\PikeException
     */
    private function validateContentType(ContentTypeDef $contentType): bool {
        if (!($errors = ContentTypeValidator::validate($contentType)))
            return true;
        throw new PikeException('Got invalid content type: '. implode(',', $errors),
                                PikeException::BAD_INPUT);
    }
    /**
     * @param \RadCms\ContentType\ContentTypeCollection $contentTypes
     * @param string $size
     * @return bool
     * @throws \Pike\PikeException
     */
    private function createContentTypes(ContentTypeCollection $contentTypes,
                                        string $size): bool {
        $sql = '';
        foreach ($contentTypes as $type) {
            $sql .= 'CREATE TABLE `${p}' . $type->name . '` (' .
                '`id` ' . strtoupper($size) . 'INT UNSIGNED NOT NULL AUTO_INCREMENT' .
                ', `status` TINYINT(1) UNSIGNED NOT NULL DEFAULT ' . DAO::STATUS_PUBLISHED .
                ', ' . $type->fields->toSqlTableFields() .
                ', PRIMARY KEY (`id`)' .
            ') DEFAULT CHARSET = utf8mb4;';
        }
        // @allow \Pike\PikeException
        $this->db->exec($sql);
        return true;
    }
    /**
     * @param \RadCms\ContentType\ContentTypeCollection $contentTypes
     * @return bool
     * @throws \Pike\PikeException
     */
    private function removeContentTypes(ContentTypeCollection $contentTypes): bool {
        // @allow \Pike\PikeException
        $this->db->exec(implode('', array_map(function ($type) {
            return 'DROP TABLE `${p}' . $type->name . '`;';
        }, $contentTypes->getArrayCopy())));
        return true;
    }
    /**
     * @param \RadCms\ContentType\ContentTypeCollection $contentTypes
     * @return bool
     * @throws \Pike\PikeException
     */
    private function addToInstalledContentTypes(ContentTypeCollection $contentTypes): bool {
        // @allow \Pike\PikeException
        $row = $this->db->fetchOne('SELECT `installedContentTypes` FROM ${p}cmsState');
        if (!$row || !strlen($row['installedContentTypes'] ?? ''))
            throw new PikeException('Failed to fetch cmsState.`installedContentTypes`',
                                    PikeException::FAILED_DB_OP);
        if (($parsed = json_decode($row['installedContentTypes'])) === null)
            throw new PikeException('Failed to parse cmsState.`installedContentTypes`',
                                    PikeException::BAD_INPUT);
        $newCompactFormContentTypes = array_merge(
            $contentTypes->toCompactForm($this->origin),
            $parsed
        );
        // @allow \Pike\PikeException
        if ($this->db->exec(
            'UPDATE ${p}cmsState SET `installedContentTypes` = JSON_UNQUOTE(?)' .
            ', `installedContentTypesLastUpdated` = UNIX_TIMESTAMP()',
            [json_encode($newCompactFormContentTypes)]) > 0) {
            return true;
        }
        throw new PikeException('Failed to update cmsState.`installedContentTypes`',
                                PikeException::INEFFECTUAL_DB_OP);
    }
    /**
     * @param \RadCms\ContentType\ContentTypeDef $contentType
     * @throws \Pike\PikeException
     */
    private function updateInstalledContenType(ContentTypeDef $contentType): void {
        $compacted = $contentType->toCompactForm();
        // @allow \Pike\PikeException
        if ($this->db->exec(
            'UPDATE ${p}cmsState SET' .
            ' `installedContentTypes` = JSON_REPLACE(`installedContentTypes`' .
                                                    ', ?, CAST(? AS JSON))' .
            ', `installedContentTypesLastUpdated` = UNIX_TIMESTAMP()',
            ["\$[{$contentType->index}]", json_encode($compacted)]) !== 1)
            throw new PikeException('Failed to update cmsState.`installedContentTypes`',
                                    PikeException::INEFFECTUAL_DB_OP);
    }
    /**
     * @param array|null $data array<[string, array<\stdClass>]>
     * @param \RadCms\ContentType\ContentTypeCollection $contentTypes
     * @return bool
     * @throws \Pike\PikeException
     */
    private function insertInitialData($data, ContentTypeCollection $contentTypes): bool {
        if (!$data) return true;
        $dmo = new DMO($this->db, $contentTypes,
                       false // no revisions
                       );
        foreach ($data as [$contentTypeName, $contentNodes]) {
            foreach ($contentNodes as $data) {
                if (!property_exists($data, 'status'))
                    $data->status = DAO::STATUS_PUBLISHED;
                // @allow \Pike\PikeException
                $dmo->insert($contentTypeName, $data);
            }
        }
        return true;
    }
    /**
     * @param \RadCms\ContentType\ContentTypeCollection $contentTypes
     * @return bool
     * @throws \Pike\PikeException
     */
    private function removeFromInstalledContentTypes(ContentTypeCollection $contentTypes): bool {
        $placeholders = [];
        $values = [];
        foreach ($contentTypes as $t) {
            $values[] = "\$[{$t->index}]";
            $placeholders[] = '?';
        }
        // @allow \Pike\PikeException
        if ($this->db->exec('UPDATE ${p}cmsState SET `installedContentTypes` =' .
                            ' JSON_REMOVE(`installedContentTypes`' .
                                          ', ' . implode(',', $placeholders) . ')' .
                            ', `installedContentTypesLastUpdated` = UNIX_TIMESTAMP()',
                            $values) > 0) {
            return true;
        }
        throw new PikeException('Failed to update cmsState.`installedContentTypes`',
                                PikeException::INEFFECTUAL_DB_OP);
    }
}
