<?php

namespace RadCms\Content;

use RadCms\ContentType\ContentTypeValidator;
use RadCms\Common\RadException;

/**
 * DataManipulationObject: implementoi sisältötyyppidatan insert-, update-, ja
 * delete -operaatiot.
 */
class DMO extends DAO {
    public $lastInsertId;
    /** 
     * @param string $contentTypeName
     * @param object $data
     * @return int $db->rowCount()
     * @throws \RadCms\Common\RadException
     */
    public function insert($contentTypeName, $data) {
        $this->lastInsertId = 0;
        // @allow \RadCms\Common\RadException
        $type = $this->getContentType($contentTypeName);
        if (($errors = ContentTypeValidator::validateInsertData($type, $data)))
            throw new RadException(implode(PHP_EOL, $errors),
                                   RadException::BAD_INPUT);
        $q = ['cols' => [], 'qs' => [], 'vals' => []];
        foreach ($type->fields->toArray() as $f) {
            $q['cols'][] = '`' . $f->name . '`';
            $q['qs'][] = '?';
            $q['vals'][] = $data->{$f->name};
        }
        try {
            $numRows = $this->db->exec('INSERT INTO ${p}' . $contentTypeName .
                                       ' (' . implode(', ', $q['cols']) . ')' .
                                       ' VALUES (' . implode(', ', $q['qs']) . ')',
                                       $q['vals']);
            $this->lastInsertId = $this->db->lastInsertId();
            return $numRows;
        } catch (\PDOException $e) {
            throw new RadException($e->getMessage(), RadException::FAILED_DB_OP);
        }
    }
    /**
     * @param string $id
     * @param string $contentTypeName
     * @param object $data
     * @return int $db->rowCount()
     * @throws \RadCms\Common\RadException
     */
    public function update($id, $contentTypeName, $data) {
        if (!is_string($id) || !ctype_digit($id))
            throw new RadException('id must be a \'[0-9]+\'', RadException::BAD_INPUT);
        // @allow \RadCms\Common\RadException
        $type = $this->getContentType($contentTypeName);
        if (($errors = ContentTypeValidator::validateUpdateData($type, $data)))
            throw new RadException(implode(PHP_EOL, $errors),
                                   RadException::BAD_INPUT);
        //
        $q = ['colQs' => [], 'vals' => []];
        foreach ($type->fields->toArray() as $f) {
            $q['colQs'][] = '`' . $f->name . '` = ?';
            $q['vals'][] = $data->{$f->name};
        }
        $q['vals'][] = $id;
        try {
            return $this->db->exec('UPDATE ${p}' . $contentTypeName .
                                   ' SET ' . implode(', ', $q['colQs']) .
                                   ' WHERE `id` = ?',
                                   $q['vals']);
        } catch (\PDOException $e) {
            throw new RadException($e->getMessage(), RadException::FAILED_DB_OP);
        }
    }
}
