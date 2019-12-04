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
     * @param bool $withRevision = false
     * @return int $db->rowCount()
     * @throws \RadCms\Common\RadException
     */
    public function insert($contentTypeName, $data, $withRevision = false) {
        $this->lastInsertId = 0;
        // @allow \RadCms\Common\RadException
        $type = $this->getContentType($contentTypeName);
        if (($errors = ContentTypeValidator::validateInsertData($type, $data)))
            throw new RadException(implode(PHP_EOL, $errors),
                                   RadException::BAD_INPUT);
        $q = ['cols' => [], 'qs' => [], 'vals' => []];
        $appendVal = function ($name) use (&$q, $data) {
            $q['cols'][] = '`' . $name . '`';
            $q['qs'][] = '?';
            $q['vals'][] = $data->$name;
        };
        foreach (['id', 'isPublished'] as $optional) {
            if (property_exists($data, $optional)) $appendVal($optional);
        }
        $fields = $type->fields->toArray();
        foreach ($fields as $f) {
            $appendVal($f->name);
        }
        //
        try {
            return !$withRevision
                ? $this->insertWithoutRevision($contentTypeName, $q)
                : $this->insertWithRevision($contentTypeName, $q, $data, $fields);
        } catch (\PDOException $e) {
            $this->db->rollback();
            throw new RadException($e->getMessage(), RadException::FAILED_DB_OP);
        }
    }
    /**
     * @return int $numAffectedRows
     */
    private function insertWithoutRevision($contentTypeName, $q) {
        $numRows = $this->db->exec('INSERT INTO ${p}' . $contentTypeName .
                                   ' (' . implode(', ', $q['cols']) . ')' .
                                   ' VALUES (' . implode(', ', $q['qs']) . ')',
                                   $q['vals']);
        $this->lastInsertId = $numRows ? $this->db->lastInsertId() : 0;
        return $numRows;
    }
    /**
     * @return int $numAffectedRows
     */
    private function insertWithRevision($contentTypeName, $q, $data, $fields) {
        $this->db->beginTransaction();
        $numRows = 0;
        $numRows2 = 0;
        if (($numRows = $this->insertWithoutRevision($contentTypeName, $q)) === 1 &&
            ($numRows2 = $this->db->exec('INSERT INTO ${p}contentRevisions VALUES (?,?,?,?)',
                                         [
                                             $this->lastInsertId,
                                             $contentTypeName,
                                             self::makeSnapshot($data, $fields),
                                             strval(time())
                                         ])) === 1) {
            $this->db->commit();
        } else {
            $this->db->rollback();
        }
        return $numRows + $numRows2;
    }
    /**
     * @param string $id
     * @param string $contentTypeName
     * @param object $data
     * @return int $db->rowCount()
     * @throws \RadCms\Common\RadException
     */
    public function update($id, $contentTypeName, $data, $isRevision = false) {
        if (!is_string($id) || !ctype_digit($id))
            throw new RadException('id must be a \'[0-9]+\'', RadException::BAD_INPUT);
        // @allow \RadCms\Common\RadException
        $type = $this->getContentType($contentTypeName);
        if (($errors = ContentTypeValidator::validateUpdateData($type, $data)))
            throw new RadException(implode(PHP_EOL, $errors),
                                   RadException::BAD_INPUT);
        //
        $q = ['colQs' => [], 'vals' => []];
        $fields = $type->fields->toArray();
        foreach ($fields as $f) {
            $q['colQs'][] = '`' . $f->name . '` = ?';
            $q['vals'][] = $data->{$f->name};
        }
        $q['vals'][] = $id;
        try {
            return !$isRevision
                ? $this->db->exec('UPDATE ${p}' . $contentTypeName .
                                  ' SET ' . implode(', ', $q['colQs']) .
                                  ' WHERE `id` = ?',
                                  $q['vals'])
                : $this->db->exec('UPDATE ${p}ContentRevisions' .
                                  ' SET `revisionSnapshot = ?' .
                                  ' WHERE `contentId` = ? AND `contentType` = ?',
                                  [
                                      self::makeSnapshot($data, $fields),
                                      $id,
                                      $contentTypeName
                                  ]);
        } catch (\PDOException $e) {
            throw new RadException($e->getMessage(), RadException::FAILED_DB_OP);
        }
    }
    /**
     * @return string
     */
    private static function makeSnapshot($data, $fields) {
        $out = [];
        foreach ($fields as $f)
            $out[$f->name] = $data->{$f->name};
        return json_encode($out, JSON_UNESCAPED_UNICODE);
    }
}
