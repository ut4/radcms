<?php

namespace RadCms\User;

use Pike\Db;

class UserRepository {
    private $db;
    /**
     * @param \Pike\Db $db
     */
    public function __construct(Db $db) {
        $this->db = $db;
    }
    /**
     * @param string $id Olettaa että validi
     * @return \RadCms\User\User|null
     */
    public function getSingle($id) {
        // @allow \Pike\PikeException
        return $this->db->fetchOne('SELECT `id`,`username`,`email`,`role`' .
                                   ' FROM ${p}users' .
                                   ' WHERE `id` = ?',
                                   [$id], \PDO::FETCH_CLASS, User::class);
    }
}

class User {
    /** @var string guidv4 */
    public $id;
    /** @var string */
    public $username;
    /** @var string */
    public $email;
    /** @var int 1 - 8388608 (ACL::ROLE_SUPER_ADMIN - ACL::ROLE_VIEWER) */
    public $role;
    /**
     * Normalisoi \PDO:n asettamat arvot.
     */
    public function __construct() {
        $this->role = (int) $this->role;
    }
}
