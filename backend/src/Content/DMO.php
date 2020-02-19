<?php

namespace RadCms\Content;

use RadCms\ContentType\ContentTypeValidator;
use Pike\PikeException;

/**
 * DataManipulationObject: implementoi sisältötyyppidatan insert-, update-, ja
 * delete -operaatiot.
 */
class DMO extends DAO {
    public $lastInsertId;
    /** 
     * @param string $contentTypeName
     * @param \stdClass $data
     * @param bool $withRevision = false
     * @return int $db->rowCount()
     * @throws \Pike\PikeException
     */
    public function insert($contentTypeName, $data, $withRevision = false) {
        $this->lastInsertId = 0;
        // @allow \Pike\PikeException
        $type = $this->getContentType($contentTypeName);
        if (($errors = ContentTypeValidator::validateInsertData($type, $data)))
            throw new PikeException(implode(PHP_EOL, $errors),
                                    PikeException::BAD_INPUT);
        $q = ['cols' => [], 'qs' => [], 'vals' => []];
        $appendVal = function ($name) use (&$q, $data) {
            $q['cols'][] = "`{$name}`";
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
            throw new PikeException($e->getMessage(), PikeException::FAILED_DB_OP);
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
     * @param \stdClass $data
     * @param string $revisionSettings = '' 'publish' | ''
     * @return int $db->rowCount()
     * @throws \Pike\PikeException
     */
    public function update($id, $contentTypeName, $data, $revisionSettings = '') {
        if (!is_string($id) || !ctype_digit($id))
            throw new PikeException('id must be a \'[0-9]+\'', PikeException::BAD_INPUT);
        // @allow \Pike\PikeException
        $type = $this->getContentType($contentTypeName);
        if (($errors = ContentTypeValidator::validateUpdateData($type, $data)))
            throw new PikeException(implode(PHP_EOL, $errors),
                                    PikeException::BAD_INPUT);
        //
        $fields = $type->fields->toArray();
        $execs = [];
        if (!$data->isRevision) {
            $execs = [self::makeUpdateMainExec($id, $contentTypeName, $data, $fields)];
        } else {
            if ($revisionSettings === ContentControllers::REV_SETTING_PUBLISH) {
                $data->isPublished = true;
                $execs = [self::makeUpdateMainExec($id, $contentTypeName, $data, $fields),
                          self::makeDeleteRevisionExec($id, $contentTypeName)];
            } else {
                $execs = [self::makeUpdateRevisionExec($id, $contentTypeName, $data, $fields)];
            }
        }
        //
        try {
            if (count($execs) === 1) {
                return $this->db->exec(...$execs[0]);
            }
            $numRowsAffectedTotal = 0;
            $this->db->beginTransaction();
            foreach ($execs as $e) {
                // @allow \Pike\PikeException
                if (($numRows = $this->db->exec(...$e)) > 0) {
                    $numRowsAffectedTotal += $numRows;
                } else {
                    $this->db->rollback();
                    return $numRowsAffectedTotal;
                }
            }
            $this->db->commit();
            return $numRowsAffectedTotal;
        } catch (\PDOException $e) {
            throw new PikeException($e->getMessage(), PikeException::FAILED_DB_OP);
        }
    }
    /**
     * @return array [<sql>, <bindVals>]
     */
    private static function makeUpdateMainExec($id, $contentTypeName, $data, $fields) {
        $q = ['colQs' => ['`isPublished` = ?'],
              'vals' => [(int)$data->isPublished]];
        foreach ($fields as $f) {
            $q['colQs'][] = "`{$f->name}` = ?";
            $q['vals'][] = $data->{$f->name};
        }
        $q['vals'][] = $id;
        //
        return [
            'UPDATE ${p}' . $contentTypeName .
            ' SET ' . implode(', ', $q['colQs']) .
            ' WHERE `id` = ?',
            $q['vals']
        ];
    }
    /**
     * @return array [<sql>, <bindVals>]
     */
    private static function makeUpdateRevisionExec($id, $contentTypeName, $data, $fields) {
        return [
            'UPDATE ${p}contentRevisions' .
            ' SET `revisionSnapshot` = ?' .
            ' WHERE `contentId` = ? AND `contentType` = ?',
            [
                self::makeSnapshot($data, $fields),
                $id,
                $contentTypeName
            ]
        ];
    }
    /**
     * @return array [<sql>, <bindVals>]
     */
    private static function makeDeleteRevisionExec($id, $contentTypeName) {
        return [
            'DELETE FROM ${p}contentRevisions' .
            ' WHERE `contentId` = ? AND `contentType` = ?',
            [$id, $contentTypeName]
        ];
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
