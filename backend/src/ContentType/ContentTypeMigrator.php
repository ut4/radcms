<?php

namespace RadCms\ContentType;

use RadCms\Framework\Db;

/**
 * Luokka joka asentaa/päivittää/poistaa sisältötyyppejä tietokantaan.
 */
class ContentTypeMigrator {
    const FIELD_DATA_TYPES = ['text', 'json'];
    const COLLECTION_SIZES = ['tiny', 'small', 'medium', '', 'big'];
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
        $ctypeDefs = $contentTypes->toArray();
        $this->validateContentTypes($ctypeDefs);
        $this->createContentTypes($ctypeDefs, $size);
        $this->addActiveContentTypes($ctypeDefs);
    }
    /**
     * @param \RadCms\ContentType\ContentTypeCollection $contentTypes
     * @return bool
     * @throws \RuntimeException
     */
    public function uninstallMany(ContentTypeCollection $contentTypes) {
        $ctypeDefs = $contentTypes->toArray();
        $this->validateContentTypes($ctypeDefs);
        $this->removeContentTypes($ctypeDefs);
        $this->removeActiveContentTypes($ctypeDefs);
    }
    /**
     * @param array $ctypeDefs Array<ContentTypeDef>
     * @throws \RuntimeException
     */
    private function validateContentTypes($ctypeDefs) {
        $errors = array_reduce($ctypeDefs, function ($all, $def) {
            return array_merge($all, ContentTypeValidator::validate($def));
        }, []);
        if ($errors) {
            throw new \RuntimeException('Invalid content type(s): ' . implode(',', $errors));
        }
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
    private function addActiveContentTypes($ctypeDefs) {
        if ($this->db->exec('UPDATE ${p}websiteState SET `activeContentTypes` =' .
                            ' JSON_MERGE_PATCH(`activeContentTypes`, ?)',
                            [json_encode(array_reduce($ctypeDefs, function ($map, $t) {
                                $map[$t->name] = [$t->friendlyName, $t->fields];
                                return $map;
                            }, []))]) < 1) {
            throw new \RuntimeException('Failed to update websiteState.`activeContentTypes`');
        }
    }
    /**
     * @param array $ctypeDefs Array<ContentTypeDef>
     * @throws \RuntimeException
     */
    private function removeActiveContentTypes($ctypeDefs) {
        $placeholders = [];
        $values = [];
        foreach ($ctypeDefs as $t) {
            array_push($values, '$."' . $t->name . '"');
            array_push($placeholders, '?');
        }
        if ($this->db->exec('UPDATE ${p}websiteState SET `activeContentTypes` =' .
                            ' JSON_REMOVE(`activeContentTypes`, ' .
                            implode(',', $placeholders) . ')', $values) < 1) {
            throw new \RuntimeException('Failed to update websiteState.`activeContentTypes`');
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
