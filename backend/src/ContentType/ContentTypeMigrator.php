<?php

namespace RadCms\ContentType;

use Pike\Db;
use RadCms\Plugin\Plugin;
use RadCms\Content\DMO;
use Pike\PikeException;

/**
 * Luokka joka asentaa/päivittää/poistaa sisältötyyppejä tietokantaan.
 */
class ContentTypeMigrator {
    private $db;
    private $origin;
    /**
     * @param \Pike\Db $db
     */
    public function __construct(Db $db) {
        $this->db = $db;
        $this->origin = 'site.json';
    }
    /**
     * @param object $data Validoitu $req->body
     */
    public function installSingle($data) {
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
               $this->addToInstalledContentTypes($contentTypes->toCompactForm($this->origin)) &&
               $this->insertInitialData($initialData, $contentTypes);
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
     * @param \RadCms\ContentType\FieldDef $field
     * @param \RadCms\ContentType\ContentTypeDef $contentType
     * @return bool
     * @throws \Pike\PikeException
     */
    public function addField(FieldDef $field, ContentTypeDef $contentType) {
        $contentType->fields[] = $field;
        try {
            $this->db->exec('ALTER TABLE ${p}' . $contentType->name .
                            ' ADD COLUMN ' . $field->toSqlTableField());
            //
            $compacted = $contentType->toCompactForm($this->origin);
            if ($this->db->exec(
                'UPDATE ${p}cmsState SET' .
                ' `installedContentTypes` = JSON_MERGE_PATCH(`installedContentTypes`, ?)' .
                ', `installedContentTypesLastUpdated` = UNIX_TIMESTAMP()',
                [json_encode([$compacted->key => $compacted->definition])]) !== 1)
                throw new PikeException('Failed to update cmsState.`installedContentTypes`',
                                        PikeException::INEFFECTUAL_DB_OP);
            return true;
        } catch (\PDOException $e) {
            throw new PikeException('Unexpected database error:' . $e->getMessage(),
                                    PikeException::FAILED_DB_OP);
        }
    }
    /**
     * @param string $origin
     */
    public function setOrigin(Plugin $plugin) {
        $this->origin = $plugin->name . '.json';
    }
    /**
     * @param \RadCms\ContentType\ContentTypeCollection $contentTypes
     * @return bool
     * @throws \Pike\PikeException
     */
    private function validateContentTypes($contentTypes) {
        if (!($errors = ContentTypeValidator::validateAll($contentTypes)))
            return true;
        throw new PikeException(implode(',', $errors), PikeException::BAD_INPUT);
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
     * @return bool
     * @throws \Pike\PikeException
     */
    private function createContentTypes($contentTypes, $size) {
        $sql = '';
        foreach ($contentTypes as $type) {
            $sql .= 'CREATE TABLE ${p}' . $type->name . '(' .
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
                return 'DROP TABLE ${p}' . $type->name . ';';
            }, $contentTypes->getArrayCopy())));
            return true;
        } catch (\PDOException $e) {
            throw new PikeException($e->getMessage(), PikeException::FAILED_DB_OP);
        }
    }
    /**
     * @param array $compactCtypes see ContentTypeCollection->toCompactForm()
     * @return bool
     * @throws \Pike\PikeException
     */
    private function addToInstalledContentTypes($compactCtypes) {
        try {
            if ($this->db->exec(
                'UPDATE ${p}cmsState SET `installedContentTypes` =' .
                ' JSON_MERGE_PATCH(?, `installedContentTypes`)' .
                ', `installedContentTypesLastUpdated` = UNIX_TIMESTAMP()',
                [json_encode($compactCtypes)]) > 0) {
                return true;
            }
            throw new PikeException('Failed to update cmsState.`installedContentTypes`',
                                    PikeException::INEFFECTUAL_DB_OP);
        } catch (\PDOException $e) {
            throw new PikeException($e->getMessage(), PikeException::FAILED_DB_OP);
        }
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
            $values[] = '$."' . $t->name . '"';
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
