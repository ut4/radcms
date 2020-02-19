<?php

namespace RadCms\User;

use Pike\Db;
use Pike\PikeException;

class UserRepository {
    private $db;
    /**
     * @param \Pike\Db $db
     */
    public function __construct(Db $db) {
        $this->db = $db;
    }
    /**
     * @param string $wherePlaceholders Olettaa että on validi
     * @param array $whereVals Olettaa että on validi
     * @return \RadCms\User\User|null
     */
    public function getSingle($wherePlaceholders, $whereVals) {
        try {
            $row = $this->db->fetchOne('SELECT `id`,`username`,`email`,`role`' .
                                       ' FROM ${p}users' .
                                       ' WHERE ' . $wherePlaceholders,
                                       $whereVals);
            return $row ? User::fromDbResult($row) : null;
        } catch (\PDOException $e) {
            throw new PikeException("Failed to fetch user: {$e->getMessage()}",
                                    PikeException::FAILED_DB_OP);
        }
    }
}

class User {
    /** @var string guidv4 */
    public $id;
    /** @var string */
    public $username;
    /** @var string */
    public $email;
    /** @var int 0 - 255 (ACL::ROLE_SUPER_ADMIN - ACL::ROLE_VIEWER) */
    public $role;
    /**
     * @param array $row
     * @return \RadCms\User\User
     */
    public static function fromDbResult($row) {
        $out = new User;
        $out->id = $row['id'];
        $out->username = $row['username'];
        $out->email = $row['email'];
        $out->role = (int)$row['role'];
        return $out;
    }
}
