<?php

namespace RadCms\ContentType;

use RadCms\Common\Db;

/**
 * Luokka joka asentaa/päivittää/poistaa sisältötyyppejä tietokantaan.
 */
class ContentTypeMigrator {
    const FIELD_DATA_TYPES = ['text', 'json'];
    const COLLECTION_SIZES = ['tiny', 'small', 'medium', '', 'big'];
    private $db;
    /**
     * @param \RadCms\Common\Db $db
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
        $ctypeDefs = $contentTypes->toArray();
        $errors = array_reduce($ctypeDefs, function ($all, $def) {
            return array_merge($all, ContentTypeValidator::validate($def));
        }, []);
        if ($errors) {
            throw new \RuntimeException('Invalid content type(s): ' . implode(',', $errors));
        }
        $this->createContentTypes($ctypeDefs, $size);
        if ($this->updateActiveContentTypes($ctypeDefs) < 1) {
            throw new \RuntimeException('Failed to update websiteState.`activeContentTypes`');
        }
    }
    /**
     * .
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
     * .
     */
    private function updateActiveContentTypes($ctypeDefs) {
        return $this->db->exec('UPDATE ${p}websiteState SET `activeContentTypes` =' .
                               ' JSON_MERGE_PATCH(`activeContentTypes`, ?)',
                               [json_encode(array_map(function ($t) {
                                   return [$t->name, $t->friendlyName, $t->fields];
                               }, $ctypeDefs))]);
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
