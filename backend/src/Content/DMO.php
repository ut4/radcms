<?php

declare(strict_types=1);

namespace RadCms\Content;

use Pike\PikeException;
use RadCms\Content\Internal\RevisionRepository;
use RadCms\ContentType\{ContentTypeDef, ContentTypeValidator, FieldCollection};

/**
 * DataManipulationObject: implementoi sisältötyyppidatan insert-, update-, ja
 * delete -operaatiot.
 */
class DMO extends DAO {
    /** @var string */
    public $lastInsertId;
    /** 
     * @param string $contentTypeName
     * @param \stdClass $inputData
     * @param bool $asDraft = false
     * @param bool $insertRevision = false
     * @return int $numAffectedRows
     * @throws \Pike\PikeException
     */
    public function insert(string $contentTypeName,
                           \stdClass $inputData,
                           bool $asDraft = false,
                           bool $insertRevision = false): int {
        $this->lastInsertId = '0';
        // @allow \Pike\PikeException
        $type = $this->getContentType($contentTypeName);
        if (($errors = ContentTypeValidator::validateInsertData($type, $inputData)))
            throw new PikeException(implode(PHP_EOL, $errors),
                                    PikeException::BAD_INPUT);
        $data = new \stdClass;
        foreach (['id', 'status'] as $optional) {
            if (($inputData->{$optional} ?? null) !== null)
                $data->{$optional} = $inputData->{$optional};
        }
        foreach ($type->fields as $f) {
            $data->{$f->name} = $inputData->{$f->name};
        }
        //
        [$qList, $values, $columns] = $this->db->makeInsertQParts($data);
        // @allow \Pike\PikeException
        $this->db->beginTransaction();
        $numRows = $this->db->exec("INSERT INTO `\${p}{$type->name}` ({$columns})" .
                                   " VALUES ({$qList})", $values);
        $this->lastInsertId = $numRows ? $this->db->lastInsertId() : '0';
        if ($this->lastInsertId && $insertRevision)
            $numRows += $this->insertRevision($this->lastInsertId, $type,
                self::makeSnapshot($data, $type->fields), $asDraft);
        $this->db->commit();
        return $numRows;
    }
    /**
     * @param string $id
     * @param string $contentTypeName
     * @param \stdClass $data
     * @param string $publishSettings = '' 'publish' | 'unpublish' | ''
     * @param bool $insertRevision = false
     * @return int $numAffectedRows
     * @throws \Pike\PikeException
     */
    public function update(string $id,
                           string $contentTypeName,
                           \stdClass $data,
                           string $publishSettings = '',
                           bool $insertRevision = false): int {
        // @allow \Pike\PikeException
        $type = $this->getContentType($contentTypeName);
        if (($errors = ContentTypeValidator::validateUpdateData($type, $data)))
            throw new PikeException(implode(PHP_EOL, $errors),
                                    PikeException::BAD_INPUT);
        //
        $this->db->beginTransaction();
        //
        $numRows = !$insertRevision
            ? $this->updateWithoutInsertingRevision($id, $type, $data, $publishSettings)
            : $this->updateAndInsertRevision($id, $type, $data, $publishSettings);
        //
        $this->db->commit();
        return $numRows;
    }
    /**
     * @param string $contentId
     * @param \RadCms\ContentType\ContentTypeDef $type
     * @param \stdClass $data
     * @param string $publishSettings
     * @return int $numAffectedRows
     */
    private function updateWithoutInsertingRevision(string $contentId,
                                                    ContentTypeDef $type,
                                                    \stdClass $data,
                                                    string $publishSettings): int {
        /*
        Luonnos -> Luonnos: päivitä luonnosrevisio */
        if ($data->isDraft && !$publishSettings)
            return (int) (new RevisionRepository($this->db))->update(
                self::makeSnapshot($data, $type->fields), $contentId, $type->name);
        /*
        Luonnos -> Julkaistu: päivitä julkaistu, tyhjennä luonnosrevisio */
        if ($data->isDraft && $publishSettings === ContentControllers::REV_SETTING_PUBLISH) {
            $numRows = (int) $this->updateContent($contentId, $type->name, $data, $type->fields);
            $this->clearCurrentDrafts($contentId, $type->name);
            return $numRows;
        }
        /*
        Julkaistu -> Luonnos: lisää luonnosrevisio (isCurrentDraft = 1) */
        if (!$data->isDraft && $publishSettings === ContentControllers::REV_SETTING_UNPUBLISH)
            return $this->insertRevision($contentId, $type,
                self::makeSnapshot($data, $type->fields),true);
        /*
        Julkaistu -> Julkaistu: päivitä julkaistu */
        return (int) $this->updateContent($contentId, $type->name, $data, $type->fields);
    }
    /**
     * @param string $contentId
     * @param \RadCms\ContentType\ContentTypeDef $type
     * @param \stdClass $data
     * @param string $publishSettings
     * @return int $numAffectedRows
     */
    private function updateAndInsertRevision(string $contentId,
                                             ContentTypeDef $type,
                                             \stdClass $data,
                                             string $publishSettings): int {
        $insertRevisionAsCurrentDraft = false;
        /*
        Luonnos -> Luonnos: tyhjennä nykyinen luonnosrevisio, lisää revisio */
        if ($data->isDraft && !$publishSettings) {
            $numRows = (int) $this->clearCurrentDrafts($contentId, $type->name);
            $insertRevisionAsCurrentDraft = true;
        /*
        Luonnos -> Julkaistu: päivitä julkaistu, tyhjennä luonnosrevisio, lisää revisio */
        } elseif ($data->isDraft && $publishSettings === ContentControllers::REV_SETTING_PUBLISH) {
            $numRows = (int) $this->updateContent($contentId, $type->name, $data, $type->fields);
            $this->clearCurrentDrafts($contentId, $type->name);
        /*
        Julkaistu -> Luonnos: lisää luonnosrevisio (isCurrentDraft = 1) */
        } elseif (!$data->isDraft && $publishSettings === ContentControllers::REV_SETTING_UNPUBLISH) {
            $numRows = 0;
            $insertRevisionAsCurrentDraft = true;
        /*
        Julkaistu -> Julkaistu: päivitä julkaistu, lisää revisio */
        } else {
            $numRows = (int) $this->updateContent($contentId, $type->name, $data, $type->fields);
        }
        //
        $numRows += $this->insertRevision($contentId, $type, self::makeSnapshot($data, $type->fields),
            $insertRevisionAsCurrentDraft);
        return $numRows;
    }
    /**
     * @param string $contentId
     * @param \RadCms\ContentType\ContentTypeDef $type
     * @param string $snapshot
     * @param bool $insertRevisionAsCurrentDraft
     * @return int ok = 1, fail = 0
     */
    private function insertRevision(string $contentId,
                                    ContentTypeDef $type,
                                    string $snapshot,
                                    bool $insertRevisionAsCurrentDraft): int {
        return (int) (new RevisionRepository($this->db))
            ->insert($contentId, $type->name, $snapshot, !$insertRevisionAsCurrentDraft ? 0 : 1);
    }
    /**
     * @param string $id
     * @param string $contentTypeName
     * @return int $numAffectedRows
     */
    public function delete(string $id, string $contentTypeName): int {
        // @allow \Pike\PikeException
        $cnode = $this->fetchOne($contentTypeName)->where('`id`=?', $id)->exec();
        //
        $this->db->beginTransaction();
        // @allow \Pike\PikeException
        $numRows = $this->db->exec('UPDATE `${p}' . $contentTypeName . '`' .
                                   ' SET `status` = ?' .
                                   ' WHERE `id` = ?',
                                   [DAO::STATUS_DELETED, $id]);
        if ($cnode->status === DAO::STATUS_DRAFT)
            // @allow \Pike\PikeException
            $this->clearCurrentDrafts($id, $contentTypeName);
        $this->db->commit();
        return $numRows;
    }
    /**
     * @param string $id
     * @param string $contentTypeName
     * @param \stdClass $data
     * @param \RadCms\ContentType\FieldCollection $fields
     * @return bool
     */
    private function updateContent(string $id,
                                   string $contentTypeName,
                                   \stdClass $data,
                                   FieldCollection $fields): bool {
        $colQs = ['`status` = ?'];
        $vals = [(int) $data->status];
        foreach ($fields as $f) {
            $colQs[] = "`{$f->name}` = ?";
            $vals[] = $data->{$f->name};
        }
        $vals[] = $id;
        //
        return $this->db->exec('UPDATE `${p}' . $contentTypeName . '`' .
                               ' SET ' . implode(', ', $colQs) .
                               ' WHERE `id` = ?',
                               $vals) > 0;
    }
    /**
     * @param string $contentId
     * @param string $contentTypeName
     * @return bool
     */
    private function clearCurrentDrafts(string $contentId,
                                        string $contentTypeName): bool {
        return $this->db->exec('UPDATE ${p}contentRevisions' .
                               ' SET `isCurrentDraft` = 0' .
                               ' WHERE `contentId` = ? AND `contentType` = ? AND `isCurrentDraft` = 1',
                               [
                                   $contentId,
                                   $contentTypeName
                               ]) > 0;
    }
    /**
     * @param \stdClass $data
     * @param \RadCms\ContentType\FieldCollection $fields
     * @return string
     */
    private static function makeSnapshot(\stdClass $data,
                                         FieldCollection $fields): string {
        $out = new \stdClass;
        foreach ($fields as $f)
            $out->{$f->name} = $data->{$f->name};
        return json_encode($out, JSON_UNESCAPED_UNICODE);
    }
}
