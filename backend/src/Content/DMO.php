<?php

namespace RadCms\Content;

use RadCms\ContentType\ContentTypeValidator;
use RadCms\Common\RadException;

/**
 * DataManipulationObject: implementoi sisältötyyppidatan insert-, update-, ja
 * delete -operaatiot.
 */
class DMO extends DAO {
    /** 
     * @param string $contentTypeName
     * @param object $data
     * @return int $db->rowCount()
     * @throws \RadCms\Common\RadException
     */
    public function insert($contentTypeName, $data) {
        // @allow \RadCms\Common\RadException
        $type = $this->getContentType($contentTypeName);
        if (($errors = ContentTypeValidator::validateInsertData($type, $data)))
            throw new RadException(implode(PHP_EOL, $errors),
                                   RadException::BAD_INPUT);
        $q = ['cols' => [], 'qs' => [], 'vals' => []];
        foreach ($type->fields as $key => $_) {
            $q['cols'][] = '`' . $key . '`';
            $q['qs'][] = '?';
            $q['vals'][] = $data->$key;
        }
        try {
            return $this->db->exec('INSERT INTO ${p}' . $contentTypeName .
                                   ' (' . implode(', ', $q['cols']) . ')' .
                                   ' VALUES (' . implode(', ', $q['qs']) . ')',
                                   $q['vals']);
        } catch (\PDOException $e) {
            return new RadException($e->getMessage(), RadException::FAILED_DB_OP);
        }
    }
}
