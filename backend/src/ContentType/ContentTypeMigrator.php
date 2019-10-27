<?php

namespace RadCms\ContentType;

use RadCms\Framework\Db;

/**
 * Luokka joka asentaa/päivittää/poistaa sisältötyyppejä tietokantaan.
 */
class ContentTypeMigrator {
    public const FIELD_DATA_TYPES = ['text', 'json'];
    private const COLLECTION_SIZES = ['tiny', 'small', 'medium', '', 'big'];
    private $db;
    /**
     * @param \RadCms\Framework\Db $db
     */
    public function __construct(Db $db) {
        $this->db = $db;
    }
    /**
     * @param \RadCms\ContentType\ContentTypeCollection $contentTypes
     * @param string $size = 'medium' 'tiny' | 'small' | 'medium' | '' | 'big'
     * @return bool
     * @throws \RuntimeException
     */
    public function installMany(ContentTypeCollection $contentTypes, $size = 'medium') {
        if (!in_array($size, self::COLLECTION_SIZES)) {
            throw new \RuntimeException('Not valid content type collection size ' .
                                        implode(' | ', self::COLLECTION_SIZES));
        }
        $this->validateContentTypes($contentTypes);
        $ctypeDefs = $contentTypes->toArray();
        $this->createContentTypes($ctypeDefs, $size);
        $this->addToInstalledContentTypes($ctypeDefs);
    }
    /**
     * @param \RadCms\ContentType\ContentTypeCollection $contentTypes
     * @return bool
     * @throws \RuntimeException
     */
    public function uninstallMany(ContentTypeCollection $contentTypes) {
        $this->validateContentTypes($contentTypes);
        $ctypeDefs = $contentTypes->toArray();
        $this->removeContentTypes($ctypeDefs);
        $this->removeFromInstalledContentTypes($ctypeDefs);
    }
    /**
     * @param \RadCms\ContentType\ContentTypeCollection $contentTypes
     * @throws \RuntimeException
     */
    private function validateContentTypes($contentTypes) {
        if (($errors = ContentTypeValidator::validateAll($contentTypes)))
            throw new \RuntimeException('Invalid content type(s): ' . implode(',', $errors));
    }
    /**
     * @param array $ctypeDefs Array<ContentTypeDef>
     */
    private function createContentTypes($ctypeDefs, $size) {
        $sql = '';
        foreach ($ctypeDefs as $type) {
            $sql .= 'CREATE TABLE ${p}' . $type->name . '(' .
                '`id` ' . strtoupper($size) . 'INT UNSIGNED NOT NULL AUTO_INCREMENT' .
                ', ' . $this->buildFieldsSql($type->fields) .
                ', PRIMARY KEY (`id`)' .
            ') DEFAULT CHARSET = utf8mb4;';
        }
        $this->db->exec($sql);
    }
    /**
     * @param array $ctypeDefs Array<ContentTypeDef>
     */
    private function removeContentTypes($ctypeDefs) {
        $this->db->exec(implode('', array_map(function ($type) {
            return 'DROP TABLE ${p}' . $type->name . ';';
        }, $ctypeDefs)));
    }
    /**
     * @param array $ctypeDefs Array<ContentTypeDef>
     * @throws \RuntimeException
     */
    private function addToInstalledContentTypes($ctypeDefs) {
        if ($this->db->exec('UPDATE ${p}websiteState SET `installedContentTypes` =' .
                            ' JSON_MERGE_PATCH(`installedContentTypes`, ?)' .
                            ', `installedContentTypesLastUpdated` = UNIX_TIMESTAMP()',
                            [json_encode(array_reduce($ctypeDefs, function ($map, $t) {
                                $map[$t->name] = [$t->friendlyName, $t->fields];
                                return $map;
                            }, []))]) < 1) {
            throw new \RuntimeException('Failed to update websiteState.`installedContentTypes`');
        }
    }
    /**
     * @param array $ctypeDefs Array<ContentTypeDef>
     * @throws \RuntimeException
     */
    private function removeFromInstalledContentTypes($ctypeDefs) {
        $placeholders = [];
        $values = [];
        foreach ($ctypeDefs as $t) {
            array_push($values, '$."' . $t->name . '"');
            array_push($placeholders, '?');
        }
        if ($this->db->exec('UPDATE ${p}websiteState SET `installedContentTypes` =' .
                            ' JSON_REMOVE(`installedContentTypes`' .
                                         ', ' . implode(',', $placeholders) . ')' .
                            ', `installedContentTypesLastUpdated` = UNIX_TIMESTAMP()',
                            $values) < 1) {
            throw new \RuntimeException('Failed to update websiteState.`installedContentTypes`');
        }
    }
    /**
     * @param array $fields
     * @return string
     */
    private function buildFieldsSql($fields) {
        $out = [];
        foreach ($fields as $name => $dataType) {
            array_push($out, "`{$name}` " . [
                'text' => 'TEXT',
                'json' => 'TEXT'
            ][$dataType]);
        }
        return implode(',', $out);
    }
}
