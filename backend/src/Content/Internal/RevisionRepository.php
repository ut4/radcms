<?php

declare(strict_types=1);

namespace RadCms\Content\Internal;

use Pike\Db;

final class RevisionRepository {
    /** @var \Pike\Db */
    private $db;
    /**
     * @param \Pike\Db $db
     */
    public function __construct(Db $db) {
        $this->db = $db;
    }
    /**
     * @param string $contentId
     * @param string $contentTypeName
     * @param string $snapshot
     * @param int $isCurrentDraft = 0
     * @return bool
     */
    public function insert(string $contentId,
                           string $contentTypeName,
                           string $snapshot,
                           int $isCurrentDraft = 0): bool {
        // @allow \Pike\PikeException
        $numRows = $this->db->exec('INSERT INTO ${p}contentRevisions (`contentId`'.
                                   ',`contentType`,`snapshot`,`isCurrentDraft`,`createdAt`) VALUES (?,?,?,?,?)',
                                   [
                                       $contentId,
                                       $contentTypeName,
                                       $snapshot,
                                       $isCurrentDraft,
                                       time(),
                                   ]);
        // @allow \Pike\PikeException
        $this->db->exec(
            'DELETE FROM ${p}contentRevisions WHERE `id` = (SELECT `id` FROM (' .
                'SELECT `id` FROM ${p}contentRevisions WHERE' .
                ' (SELECT COUNT(`id`) FROM ${p}contentRevisions WHERE `contentId` = ? AND `contentType` = ?) > ?' .
                ' AND `contentId` = ?' .
                ' AND `contentType` = ?' .
                ' AND `isCurrentDraft` = 0' .
                ' ORDER BY `createdAt`' .
                ' LIMIT 1' .
            ') as ir)',
            [
                $contentId,
                $contentTypeName,
                10,
                $contentId,
                $contentTypeName,
            ]
        );
        return $numRows > 0;
    }
    /**
     * @param string $contentId
     * @param string $contentTypeName
     * @return \stdClass[]
     */
    public function getMany(string $contentId, string $contentTypeName): array {
        // @allow \Pike\PikeException
        return $this->db->fetchAll('SELECT * FROM ${p}contentRevisions' .
                                   ' WHERE `contentId` = ? AND `contentType` = ?' .
                                   ' ORDER BY `createdAt` DESC',
                                   [$contentId, $contentTypeName],
                                   \PDO::FETCH_CLASS,
                                   '\stdClass');
    }
    /**
     * @param string $snapshot
     * @param string $contentId
     * @param string $contentTypeName
     * @return int $numAffectedRows
     */
    public function update(string $snapshot, string $contentId, string $contentTypeName): int {
        [$columns, $values] = $this->db->makeUpdateQParts(['field' => 'value']);
        return $this->db->exec("UPDATE \${p}contentRevisions SET `snapshot` = ?" .
                               " WHERE `contentId` = ? AND `contentType` = ?",
                               [$snapshot, $contentId, $contentTypeName]);
    }
}
