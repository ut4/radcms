<?php

namespace RadCms\Content;

use RadCms\ContentType\ContentTypeValidator;

/**
 * DataManipulationObject: implementoi sisältötyyppidatan insert-, update-, ja
 * delete -operaatiot.
 */
class DMO extends DAO {
    /** 
     * @param string $contentTypeName
     * @param object $data
     */
    public function insert($contentTypeName, $data) {
        if (!($type = $this->getContentType($contentTypeName))) return;
        if (($errors = ContentTypeValidator::validateInsertData($type, $data))) {
            return $errors;
        }
        $q = ['cols' => [], 'qs' => [], 'vals' => []];
        foreach ($type->fields as $key => $_) {
            $q['cols'][] = '`' . $key . '`';
            $q['qs'][] = '?';
            $q['vals'][] = $data->$key;
        }
        return $this->db->exec('INSERT INTO ${p}' . $contentTypeName .
                               ' (' . implode(', ', $q['cols']) . ')' .
                               ' VALUES (' . implode(', ', $q['qs']) . ')',
                               $q['vals']);
    }
}
