<?php

declare(strict_types=1);

namespace RadCms\Content;

use RadCms\ContentType\ContentTypeValidator;
use Pike\PikeException;
use RadCms\ContentType\FieldCollection;

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
    public function insert(string $contentTypeName,
                           \stdClass $data,
                           bool $withRevision = false) {
        $this->lastInsertId = 0;
        // @allow \Pike\PikeException
        $type = $this->getContentType($contentTypeName);
        if (($errors = ContentTypeValidator::validateInsertData($type, $data)))
            throw new PikeException(implode(PHP_EOL, $errors),
                                    PikeException::BAD_INPUT);
        $q = (object) ['cols' => [], 'qs' => [], 'vals' => []];
        $appendVal = function ($name) use ($q, $data) {
            $q->cols[] = "`{$name}`";
            $q->qs[] = '?';
            $q->vals[] = $data->$name;
        };
        foreach (['id', 'status'] as $optional) {
            if (($data->{$optional} ?? null) !== null) $appendVal($optional);
        }
        foreach ($type->fields as $f) {
            $appendVal($f->name);
        }
        //
        try {
            return !$withRevision
                ? $this->insertWithoutRevision($contentTypeName, $q)
                : $this->insertWithRevision($contentTypeName, $q, $data, $type->fields);
        } catch (\PDOException $e) {
            $this->db->rollback();
            throw new PikeException($e->getMessage(), PikeException::FAILED_DB_OP);
        }
    }
    /**
     * @return int $numAffectedRows
     */
    private function insertWithoutRevision(string $contentTypeName,
                                           \stdClass $q): int {
        $numRows = $this->db->exec('INSERT INTO `${p}' . $contentTypeName . '`' .
                                   ' (' . implode(', ', $q->cols) . ')' .
                                   ' VALUES (' . implode(', ', $q->qs) . ')',
                                   $q->vals);
        $this->lastInsertId = $numRows ? $this->db->lastInsertId() : 0;
        return $numRows;
    }
    /**
     * @return int $numAffectedRows
     */
    private function insertWithRevision(string $contentTypeName,
                                        \stdClass $q,
                                        \stdClass $data,
                                        FieldCollection $fields): int {
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
    public function update(string $id,
                           string $contentTypeName,
                           \stdClass $data,
                           string $revisionSettings = ''): int {
        if (!ctype_digit($id))
            throw new PikeException('id must be a \'[0-9]+\'', PikeException::BAD_INPUT);
        // @allow \Pike\PikeException
        $type = $this->getContentType($contentTypeName);
        if (($errors = ContentTypeValidator::validateUpdateData($type, $data)))
            throw new PikeException(implode(PHP_EOL, $errors),
                                    PikeException::BAD_INPUT);
        try {
            $this->db->beginTransaction();
            $doPublish = $revisionSettings === ContentControllers::REV_SETTING_PUBLISH;
            $numRows = 0;
            if (!$data->isRevision || $doPublish)
                $numRows = $this->db->exec(...$this->makeUpdateMainExec($id, $contentTypeName, $data, $type->fields));
            //
            if ($doPublish)
                $numRows += $this->db->exec(...self::makeDeleteRevisionExec($id, $contentTypeName));
            elseif ($data->isRevision)
                $numRows += $this->db->exec(...self::makeUpdateRevisionExec($id, $contentTypeName, $data, $type->fields));
            //
            $this->db->commit();
            return $numRows;
        } catch (\PDOException $e) {
            throw new PikeException($e->getMessage(), PikeException::FAILED_DB_OP);
        }
    }
    /**
     * @param string $id
     * @param string $contentTypeName
     * @return int
     * @throws \Pike\PikeException
     */
    public function delete(string $id, string $contentTypeName): int {
        // @allow \Pike\PikeException
        $cnode = $this->fetchOne($contentTypeName)->where('`id`=?', $id)->exec();
        try {
            $this->db->beginTransaction();
            //
            $numOps = 1;
            $numRows = $this->db->exec('UPDATE `${p}' . $contentTypeName . '`' .
                                       ' SET `status` = ?' .
                                       ' WHERE `id` = ?',
                                       [DAO::STATUS_DELETED, $id]);
            if ($numRows && $cnode->status === DAO::STATUS_DRAFT) {
                $numOps += 1;
                $numRows += $this->db->exec(...self::makeDeleteRevisionExec($id, $contentTypeName));
            }
            //
            if ($numRows < $numOps)
                throw new PikeException('numAffectedRows < expected',
                                        PikeException::INEFFECTUAL_DB_OP);
            $this->db->commit();
            return $numRows;
        } catch (\PDOException $e) {
            throw new PikeException($e->getMessage(), PikeException::FAILED_DB_OP);
        }
    }
    /**
     * @return array [<sql>, <bindVals>]
     */
    private static function makeUpdateMainExec(string $id,
                                               string $contentTypeName,
                                               \stdClass $data,
                                               FieldCollection $fields): array {
        $q = (object) ['colQs' => ['`status` = ?'],
                       'vals' => [(int) $data->status]];
        foreach ($fields as $f) {
            $q->colQs[] = "`{$f->name}` = ?";
            $q->vals[] = $data->{$f->name};
        }
        $q->vals[] = $id;
        //
        return [
            'UPDATE `${p}' . $contentTypeName . '`' .
            ' SET ' . implode(', ', $q->colQs) .
            ' WHERE `id` = ?',
            $q->vals
        ];
    }
    /**
     * @return array [<sql>, <bindVals>]
     */
    private static function makeUpdateRevisionExec(string $id,
                                                   string $contentTypeName,
                                                   \stdClass $data,
                                                   FieldCollection $fields): array {
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
    private static function makeDeleteRevisionExec(string $id,
                                                   string $contentTypeName): array {
        return [
            'DELETE FROM ${p}contentRevisions' .
            ' WHERE `contentId` = ? AND `contentType` = ?',
            [$id, $contentTypeName]
        ];
    }
    /**
     * @return string
     */
    private static function makeSnapshot(\stdClass $data,
                                         FieldCollection $fields): string {
        $out = [];
        foreach ($fields as $f)
            $out[$f->name] = $data->{$f->name};
        return json_encode($out, JSON_UNESCAPED_UNICODE);
    }
}
