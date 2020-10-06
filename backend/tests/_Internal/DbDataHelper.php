<?php

declare(strict_types=1);

namespace RadCms\Tests\_Internal;

use Pike\{Db, PikeException, Validation};

class DbDataHelper {
    /** @var \Pike\Db */
    private $db;
    /**
     * @param \Pike\Db $db
     */
    public function __construct(Db $db) {
        $this->db = $db;
    }
    /**
     * @param object[] $data
     * @param string $tableName
     */
    public function insertData(array $data, string $tableName): void {
        [$qGroups, $vals, $cols] = $this->db->makeBatchInsertQParts($data);
        if (!Validation::isIdentifier($tableName)) throw new PikeException('Wut?');
        $numRows = $this->db->exec("INSERT INTO `\${p}{$tableName}` ({$cols}) VALUES {$qGroups}",
                                   $vals);
        if ($numRows !== count($data))
            throw new PikeException(sprintf('Expected to insert %d items to %s but actually inserted %d',
                                            count($data),
                                            $tableName,
                                            $numRows),
                                    PikeException::FAILED_DB_OP);
    }
}