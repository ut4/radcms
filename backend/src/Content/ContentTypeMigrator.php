<?php

namespace RadCms\Content;

use RadCms\Common\Db;
use RadCms\Framework\GenericArray;

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
     * @param \RadCms\Framework\GenericArray $contentTypes Array<\RadCms\Content\ContentTypeDef>
     * @param string $size = 'medium' 'tiny' | 'small' | 'medium' | '' | 'big'
     * @return bool
     * @throws \RuntimeException
     */
    public function installMany(GenericArray $contentTypes, $size = 'medium') {
        if (!in_array($size, self::COLLECTION_SIZES)) {
            throw new \RuntimeException('Not valid content type collection size ' .
                                        implode(' | ', self::COLLECTION_SIZES));
        }
        $typeDefs = $contentTypes->toArray();
        $errors = array_reduce($typeDefs, function ($all, $def) {
            return array_merge($all, ContentTypeValidator::validate($def));
        }, []);
        if ($errors) {
            throw new \RuntimeException('Invalid content type(s): ' . implode(',', $errors));
        }
        $sql = '';
        foreach ($typeDefs as $type) {
            $sql .= 'CREATE TABLE ${p}' . $type->name . '(' .
                '`id` ' . strtoupper($size) . 'INT UNSIGNED NOT NULL AUTO_INCREMENT' .
                ', ' . $this->buildFieldsSql($type->fields) .
                ', PRIMARY KEY (`id`)' .
            ') DEFAULT CHARSET = utf8mb4;';
        }
        return $this->db->exec($sql) > 0;
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
