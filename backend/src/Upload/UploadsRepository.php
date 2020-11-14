<?php

declare(strict_types=1);

namespace RadCms\Upload;

use Pike\Db;
use RadCms\Entities\UploadsEntry;

class UploadsRepository {
    /** @var \Pike\Db */
    protected $db;
    /**
     * @param \Pike\Db $db
     */
    public function __construct(Db $db) {
        $this->db = $db;
    }
    /**
     * @param object|\RadCms\Entities\UploadsEntry[] $items
     * @return int $numAffectedRows
     */
    public function insertMany(array $items): int {
        [$qGroups, $vals, $cols] = $this->db->makeBatchInsertQParts($items);
        // @allow \Pike\PikeException
        return $this->db->exec("INSERT INTO `\${p}files` ({$cols}) VALUES {$qGroups}",
                               $vals);
    }
    /**
     * @param ?\RadCms\Upload\UploadsQFilters $filters
     */
    public function getMany(?UploadsQFilters $filters): array {
        [$whereSql, $whereVals] = $filters ? $filters->toQParts() : ['', []];
        // @allow \Pike\PikeException
        $rows = $this->db->fetchAll('SELECT * FROM `${p}files`' .
                                    ($whereSql ? " WHERE {$whereSql}" : '') .
                                    ' LIMIT 20',
                                    $whereVals,
                                    \PDO::FETCH_CLASS,
                                    UploadsEntry::class);
        foreach ($rows as $entity) self::normalizeUploadsEntity($entity);
        return $rows;
    }
    /**
     * @param \RadCms\Upload\UploadsQFilters $filters
     * @return int $numAffectedRows
     */
    public function delete(UploadsQFilters $filters): int {
        [$whereSql, $whereVals] = $filters->toQParts();
        // @allow \Pike\PikeException
        return $this->db->exec("DELETE FROM `\${p}files` WHERE {$whereSql}",
                               $whereVals);
    }
    /**
     * @return int $numAffectedRows
     */
    public function deleteAll(): int {
        // @allow \Pike\PikeException
        return $this->db->exec('DELETE FROM `${p}files`');
    }
    /**
     * @param \RadCms\Entities\UploadsEntry $entity
     */
    private static function normalizeUploadsEntity(UploadsEntry $entity): void {
        $entity->createdAt = (int) $entity->createdAt;
        $entity->updatedAt = (int) $entity->updatedAt;
    }
}
