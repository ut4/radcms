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
    /** @var int */
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
        // @allow \Pike\PikeException
        return !$withRevision
            ? $this->insertWithoutRevision($contentTypeName, $q)
            : $this->insertWithRevision($contentTypeName, $q, $data, $type->fields);
    }
    /**
     * @return int $numAffectedRows
     */
    private function insertWithoutRevision(string $contentTypeName,
                                           \stdClass $q): int {
        // @allow \Pike\PikeException
        $numRows = $this->db->exec('INSERT INTO `${p}' . $contentTypeName . '`' .
                                   ' (' . implode(', ', $q->cols) . ')' .
                                   ' VALUES (' . implode(', ', $q->qs) . ')',
                                   $q->vals);
        $this->lastInsertId = $numRows ? (int) $this->db->lastInsertId() : 0;
        return $numRows;
    }
    /**
     * @return int $numAffectedRows
     */
    private function insertWithRevision(string $contentTypeName,
                                        \stdClass $q,
                                        \stdClass $data,
                                        FieldCollection $fields): int {
        // @allow \PDOException
        if ($this->db->beginTransaction() < 0) {
            throw new PikeException('Failed to start a transaction',
                                    PikeException::FAILED_DB_OP);
        }
        $numRows = 0;
        $numRows2 = 0;
        // @allow \Pike\PikeException
        if (($numRows = $this->insertWithoutRevision($contentTypeName, $q)) === 1 &&
            ($numRows2 = $this->db->exec(...self::makeCreateRevisionExec(
                                            $this->lastInsertId, $contentTypeName,
                                            $data, $fields))) === 1) {
            $this->db->commit();
        } else {
            $this->db->rollback();
        }
        return $numRows + $numRows2;
    }
    /**
     * @param int $id
     * @param string $contentTypeName
     * @param \stdClass $data
     * @param string $revisionSettings = '' 'publish' | 'unpublish' | ''
     * @return int $db->rowCount()
     * @throws \Pike\PikeException
     */
    public function update(int $id,
                           string $contentTypeName,
                           \stdClass $data,
                           string $revisionSettings = ''): int {
        // @allow \Pike\PikeException
        $type = $this->getContentType($contentTypeName);
        if (($errors = ContentTypeValidator::validateUpdateData($type, $data)))
            throw new PikeException(implode(PHP_EOL, $errors),
                                    PikeException::BAD_INPUT);
        $this->db->beginTransaction();
        $doPublish = $revisionSettings === ContentControllers::REV_SETTING_PUBLISH;
        if ($doPublish) $data->isRevision = false;
        // @allow \Pike\PikeException
        $numRows = !$data->isRevision
            ? $this->db->exec(...self::makeUpdateMainExec($id, $contentTypeName,
                                                            $data, $type->fields))
            : $this->db->exec(...self::makeUpdateRevisionExec($id, $contentTypeName,
                                                                $data, $type->fields));
        // @allow \Pike\PikeException
        if ($doPublish)
            $numRows += $this->db->exec(...self::makeDeleteRevisionExec($id, $contentTypeName));
        elseif ($revisionSettings === ContentControllers::REV_SETTING_UNPUBLISH)
            $numRows += $this->db->exec(...self::makeCreateRevisionExec($id, $contentTypeName,
                                                                        $data, $type->fields));
        //
        $this->db->commit();
        return $numRows;

    }
    /**
     * @param int $id
     * @param string $contentTypeName
     * @return int
     * @throws \Pike\PikeException
     */
    public function delete(int $id, string $contentTypeName): int {
        // @allow \Pike\PikeException
        $cnode = $this->fetchOne($contentTypeName)->where('`id`=?', $id)->exec();
        //
        $this->db->beginTransaction();
        $numOps = 1;
        // @allow \Pike\PikeException
        $numRows = $this->db->exec('UPDATE `${p}' . $contentTypeName . '`' .
                                    ' SET `status` = ?' .
                                    ' WHERE `id` = ?',
                                    [DAO::STATUS_DELETED, $id]);
        if ($numRows && $cnode->status === DAO::STATUS_DRAFT) {
            $numOps += 1;
            // @allow \Pike\PikeException
            $numRows += $this->db->exec(...self::makeDeleteRevisionExec($id, $contentTypeName));
        }
        //
        if ($numRows < $numOps)
            throw new PikeException('numAffectedRows < expected',
                                    PikeException::INEFFECTUAL_DB_OP);
        $this->db->commit();
        return $numRows;
    }
    /**
     * @return array [<sql>, <bindVals>]
     */
    private static function makeUpdateMainExec(int $id,
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
    private static function makeUpdateRevisionExec(int $contentNodeId,
                                                   string $contentTypeName,
                                                   \stdClass $data,
                                                   FieldCollection $fields): array {
        return [
            'UPDATE ${p}contentRevisions' .
            ' SET `revisionSnapshot` = ?' .
            ' WHERE `contentId` = ? AND `contentType` = ?',
            [
                self::makeSnapshot($data, $fields),
                $contentNodeId,
                $contentTypeName
            ]
        ];
    }
    /**
     * @return array [<sql>, <bindVals>]
     */
    private static function makeDeleteRevisionExec(int $contentNodeId,
                                                   string $contentTypeName): array {
        return [
            'DELETE FROM ${p}contentRevisions' .
            ' WHERE `contentId` = ? AND `contentType` = ?',
            [$contentNodeId, $contentTypeName]
        ];
    }
    /**
     * @return array [<sql>, <bindVals>]
     */
    private static function makeCreateRevisionExec(int $contentNodeId,
                                                   string $contentTypeName,
                                                   \stdClass $data,
                                                   FieldCollection $fields): array {
        return [
            'INSERT INTO ${p}contentRevisions VALUES (?,?,?,?)',
            [
                $contentNodeId,
                $contentTypeName,
                self::makeSnapshot($data, $fields),
                strval(time())
            ]
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
