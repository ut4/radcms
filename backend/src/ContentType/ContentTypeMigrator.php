<?php

namespace RadCms\ContentType;

use Pike\Db;
use Pike\PikeException;
use Pike\ArrayUtils;
use RadCms\Plugin\Plugin;
use RadCms\Content\DMO;

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
    public function installSingle(\stdClass $data) {
        $contentTypes = new ContentTypeCollection;
        $contentTypes[] = new ContentTypeDef($data->name,
                                             $data->friendlyName,
                                             FieldCollection::fromArray($data->fields),
                                             $data->isInternal);
        // @allow \Pike\PikeException
        return $this->installMany($contentTypes);
    }
    /**
     * @param \RadCms\ContentType\ContentTypeCollection $contentTypes
     * @param string $size = 'medium' 'tiny' | 'small' | 'medium' | '' | 'big'
     * @param array $initialData = null [['ContentTypeName', [(object)['key' => 'value']]]]
     * @return bool
     * @throws \Pike\PikeException
     */
    public function installMany(ContentTypeCollection $contentTypes,
                                $initialData = null,
                                $size = 'medium') {
        if (!in_array($size, ContentTypeValidator::COLLECTION_SIZES)) {
            throw new PikeException('Not valid content type collection size ' .
                                    implode(' | ', ContentTypeValidator::COLLECTION_SIZES),
                                    PikeException::BAD_INPUT);
        }
        // @allow \Pike\PikeException
        return $this->validateContentTypes($contentTypes) &&
               $this->validateInitialData($initialData) &&
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
                                 ContentTypeCollection $currentContentTypes) {
        try {
            if ($data->name !== $contentType->name) {
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
                if ($this->db->exec(
                    'UPDATE ${p}cmsState SET'.
                    ' `installedContentTypes` = JSON_UNQUOTE(?)' .
                    ', `installedContentTypesLastUpdated` = UNIX_TIMESTAMP()',
                    [json_encode($currentContentTypes->toCompactForm($this->origin))]) !== 1)
                    throw new PikeException('Failed to rewrite cmsState.`installedContentTypes`',
                                            PikeException::INEFFECTUAL_DB_OP);
            }
            return true;
        } catch (\PDOException $e) {
            throw new PikeException($e->getMessage(), PikeException::FAILED_DB_OP);
        }
    }
    /**
     * @param \RadCms\ContentType\ContentTypeCollection $contentTypes
     * @return bool
     * @throws \Pike\PikeException
     */
    public function uninstallMany(ContentTypeCollection $contentTypes) {
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
    public function uninstallSingle(ContentTypeDef $contentType) {
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
    public function addField(FieldDef $field, ContentTypeDef $contentType) {
        // @allow \Pike\PikeException
        $this->validateContentType($contentType);
        try {
            $this->db->exec('ALTER TABLE `${p}' . $contentType->name . '`' .
                            ' ADD COLUMN ' . $field->toSqlTableField());
            //
            $contentType->fields[] = $field;
            // @allow \Pike\PikeException|\PDOException
            $this->updateInstalledContenType($contentType);
            return true;
        } catch (\PDOException $e) {
            throw new PikeException($e->getMessage(), PikeException::FAILED_DB_OP);
        }
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
                                ContentTypeDef $contentType) {
        // @allow \Pike\PikeException
        $this->validateContentType($contentType);
        try {
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
            // @allow \Pike\PikeException|\PDOException
            $this->updateInstalledContenType($contentType);
            //
            return true;
        } catch (\PDOException $e) {
            throw new PikeException($e->getMessage(), PikeException::FAILED_DB_OP);
        }
    }
    /**
     * @param \RadCms\ContentType\FieldDef $field Olettaa, että validi
     * @param \RadCms\ContentType\ContentTypeDef $contentType
     * @return bool
     * @throws \Pike\PikeException
     */
    public function removeField(FieldDef $field, ContentTypeDef $contentType) {
        // @allow \Pike\PikeException
        $this->validateContentType($contentType);
        try {
            $this->db->exec('ALTER TABLE `${p}' . $contentType->name . '`' .
                            ' DROP COLUMN `' . $field->name . '`');
            //
            $contentType->fields->offsetUnset($contentType->index);
            // @allow \Pike\PikeException|\PDOException
            $this->updateInstalledContenType($contentType);
            return true;
        } catch (\PDOException $e) {
            throw new PikeException($e->getMessage(), PikeException::FAILED_DB_OP);
        }
    }
    /**
     * @param \RadCms\Plugin\Plugin $plugin
     */
    public function setOrigin(Plugin $plugin) {
        $this->origin = $plugin->name;
    }
    /**
     * @param \RadCms\ContentType\ContentTypeCollection $contentTypes
     * @return bool
     * @throws \Pike\PikeException
     */
    private function validateContentTypes($contentTypes) {
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
    private function validateContentType($contentType) {
        if (!($errors = ContentTypeValidator::validate($contentType)))
            return true;
        throw new PikeException('Got invalid content type: '. implode(',', $errors),
                                PikeException::BAD_INPUT);
    }
    /**
     * @param array|null $data
     * @return bool
     * @throws \Pike\PikeException
     */
    private function validateInitialData($data) {
        if (!$data)
            return true;
        if (!is_array($data))
            throw new PikeException('initialData must be an array', PikeException::BAD_INPUT);
        foreach ($data as $item) {
            if (!is_array($item) ||
                count($item) !== 2 ||
                !is_string($item[0]) ||
                !is_array($item[1]) ||
                !(($item[1][0] ?? null) instanceof \stdClass))
                    throw new PikeException(
                        'initialData entry must be [["ContentTypeName", [{"key":"value"}]]]',
                        PikeException::BAD_INPUT);
        }
        return true;
    }
    /**
     * @param \RadCms\ContentType\ContentTypeCollection $contentTypes
     * @param string $size
     * @return bool
     * @throws \Pike\PikeException
     */
    private function createContentTypes($contentTypes, $size) {
        $sql = '';
        foreach ($contentTypes as $type) {
            $sql .= 'CREATE TABLE `${p}' . $type->name . '` (' .
                '`id` ' . strtoupper($size) . 'INT UNSIGNED NOT NULL AUTO_INCREMENT' .
                ', `isPublished` TINYINT(1) UNSIGNED NOT NULL DEFAULT 0' .
                ', ' . $type->fields->toSqlTableFields() .
                ', PRIMARY KEY (`id`)' .
            ') DEFAULT CHARSET = utf8mb4;';
        }
        try {
            $this->db->exec($sql);
            return true;
        } catch (\PDOException $e) {
            throw new PikeException($e->getMessage(), PikeException::FAILED_DB_OP);
        }
    }
    /**
     * @param \RadCms\ContentType\ContentTypeCollection $contentTypes
     * @return bool
     * @throws \Pike\PikeException
     */
    private function removeContentTypes($contentTypes) {
        try {
            $this->db->exec(implode('', array_map(function ($type) {
                return 'DROP TABLE `${p}' . $type->name . '`;';
            }, $contentTypes->getArrayCopy())));
            return true;
        } catch (\PDOException $e) {
            throw new PikeException($e->getMessage(), PikeException::FAILED_DB_OP);
        }
    }
    /**
     * @param \RadCms\ContentType\ContentTypeCollection $contentTypes
     * @return bool
     * @throws \Pike\PikeException
     */
    private function addToInstalledContentTypes(ContentTypeCollection $contentTypes) {
        try {
            $row = $this->db->fetchOne('SELECT `installedContentTypes` FROM ${p}cmsState');
            if (!$row || !strlen($row['installedContentTypes'] ?? ''))
                throw new PikeException('Failed to fetch cmsState.`installedContentTypes`',
                                        PikeException::FAILED_DB_OP);
            if (($parsed = json_decode($row['installedContentTypes'])) === null)
                throw new PikeException('Failed to parse cmsState.`installedContentTypes`',
                                        PikeException::BAD_INPUT);
            $newCompactFormContentTypes = array_merge(
                $contentTypes->toCompactForm($this->origin),
                is_array($parsed) ? $parsed : (array) $parsed
            );
            if ($this->db->exec(
                'UPDATE ${p}cmsState SET `installedContentTypes` = JSON_UNQUOTE(?)' .
                ', `installedContentTypesLastUpdated` = UNIX_TIMESTAMP()',
                [json_encode($newCompactFormContentTypes)]) > 0) {
                return true;
            }
            throw new PikeException('Failed to update cmsState.`installedContentTypes`',
                                    PikeException::INEFFECTUAL_DB_OP);
        } catch (\PDOException $e) {
            throw new PikeException($e->getMessage(), PikeException::FAILED_DB_OP);
        }
    }
    /**
     * @param \RadCms\ContentType\ContentTypeDef $contentType
     * @throws \Pike\PikeException
     */
    private function updateInstalledContenType(ContentTypeDef $contentType) {
        $compacted = $contentType->toCompactForm($this->origin);
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
    private function insertInitialData($data, $contentTypes) {
        if (!$data) return true;
        $dmo = new DMO($this->db, $contentTypes,
                       false // no revisions
                       );
        foreach ($data as [$contentTypeName, $contentNodes]) {
            foreach ($contentNodes as $data) {
                if (!property_exists($data, 'isPublished'))
                    $data->isPublished = true;
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
    private function removeFromInstalledContentTypes($contentTypes) {
        $placeholders = [];
        $values = [];
        foreach ($contentTypes as $t) {
            $values[] = "\$[{$t->index}]";
            $placeholders[] = '?';
        }
        try {
            if ($this->db->exec('UPDATE ${p}cmsState SET `installedContentTypes` =' .
                                ' JSON_REMOVE(`installedContentTypes`' .
                                             ', ' . implode(',', $placeholders) . ')' .
                                ', `installedContentTypesLastUpdated` = UNIX_TIMESTAMP()',
                                $values) > 0) {
                return true;
            }
            throw new PikeException('Failed to update cmsState.`installedContentTypes`',
                                    PikeException::INEFFECTUAL_DB_OP);
        } catch (\PDOException $e) {
            throw new PikeException($e->getMessage(), PikeException::FAILED_DB_OP);
        }
    }
}
