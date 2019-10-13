<?php

namespace RadCms\Common;

class Db {
    private $pdo;
    private $transactionLevel = 0;
    private $tablePrefix;
    /**
     * @param array $config see config.sample.php. Olettaa että on validi.
     */
    public function __construct($config) {
        $this->tablePrefix = $config['db.tablePrefix'];
        try {
            $this->pdo = new \PDO(
                'mysql:host=' . $config['db.host'] .
                    ';dbname=' . $config['db.database'] .
                    ';charset=' . $config['db.charset'],
                $config['db.user'],
                $config['db.pass'],
                [\PDO::ATTR_ERRMODE => \PDO::ERRMODE_EXCEPTION]
            );
        } catch (\PDOException $e) {
            die('The database connection failed: ' . $e->getCode());
        }
    }
    /**
     * @param string $query
     * @param array $params = null
     * @return array
     * @throws \PDOException
     */
    public function fetchAll($query, array $params = null) {
        $prep = $this->pdo->prepare($this->q($query));
        $prep->execute($params);
        return $prep->fetchAll(\PDO::FETCH_ASSOC);
    }
    /**
     * @param string $query
     * @param array $params = null
     * @return object|bool
     * @throws \PDOException
     */
    public function fetchOne($query, array $params = null) {
        $prep = $this->pdo->prepare($this->q($query));
        $prep->execute($params);
        return $prep->fetch(\PDO::FETCH_ASSOC);
    }
    /**
     * @param string $sql
     * @param array $params = null
     * @return int
     */
    public function exec($sql, array $params = null) {
        $prep = $this->pdo->prepare(str_replace('${p}', $this->tablePrefix, $sql));
        $prep->execute($params);
        return $prep->rowCount();
    }
    /**
     * @return bool
     */
    public function beginTransaction() {
        if (++$this->transactionLevel === 1) {
            return $this->pdo->beginTransaction();
        }
        return false;
    }
    /**
     * @return bool
     */
    public function commit() {
        if (--$this->transactionLevel === 0) {
            return $this->pdo->commit();
        }
        return false;
    }
    /**
     * @return bool
     */
    public function rollback() {
        if (--$this->transactionLevel === 0) {
            return $this->pdo->rollBack();
        }
        return false;
    }
    /**
     * @return string
     */
    public function lastInsertId() {
        return $this->pdo->lastInsertId();
    }
    /**
     * @param int $attr
     * @param mixed $value = null
     * @return mixed|bool
     */
    public function attr($attr, $value = null) {
        return !$value
            ? $this->pdo->getAttribute($attr)
            : $this->pdo->setAttribute($attr, $value);
    }
    /**
     * .
     */
    private function q($query) {
        return str_replace('${p}', $this->tablePrefix, $query);
    }
}
