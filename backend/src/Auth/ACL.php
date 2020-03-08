<?php

namespace RadCms\Auth;

use Pike\PikeException;

class ACL {
    public const ROLE_SUPER_ADMIN = 1 << 0;
    public const ROLE_EDITOR = 1 << 1;
    public const ROLE_VIEWER = 1 << 23;
    public const NO_NAME = 'none:none';
    private $resources;
    private $permissions;
    private $compactRules;
    /**
     * Esimerkki: (object)[
     *     'resources' => (object)[
     *         'content' => (object)['create' => 1 << 1, 'edit' => 1 << 2],
     *         'plugins' => (object)['install' => 1 << 1],
     *     },
     *     'userPermissions' => (object)[
     *         ACL::ROLE_FOO: (object)[
     *             'content' => (1 << 1) | (1 << 2),
     *             'plugins' => 0,
     *         ],
     *         ACL::ROLE_BAR: (object)[
     *             // Kiellä kaikki
     *         ]
     *     ]
     * ]
     *
     * @param \stdClass $compactRules {resources: \stdClass, userPermissions: \stdClass}
     */
    public function setRules(\stdClass $compactRules) {
        $this->compactRules = $compactRules;
    }
    /**
     * @param int $role
     * @param string $action
     * @param string $resource
     * @return bool
     */
    public function can($role, $action, $resource) {
        if ($role === self::ROLE_SUPER_ADMIN)
            return true;
        if (!$this->resources)
            // @allow \Pike\PikeException
            $this->parseAndLoadRules();
        $resourceRules = $this->resources->$resource ?? null;
        $userPermissions = $this->permissions->{$role} ?? null;
        if (!$resourceRules && (RAD_FLAGS & RAD_DEVMODE))
            throw new PikeException("Resource `{$resource}` doesn\'t exist",
                                    PikeException::BAD_INPUT);
        if (!$resourceRules || !$userPermissions)
            return false;
        $flags = $userPermissions->$resource ?? 0;
        $flag = $resourceRules->$action ?? null;
        if ($flag === null && (RAD_FLAGS & RAD_DEVMODE))
            throw new PikeException("Resource `{$resource}` has no action `{$action}`",
                                    PikeException::BAD_INPUT);
        if (!$flags || !$flag)
            return false;
        return (bool)($flags & $flag);
    }
    /**
     * @throws \Pike\PikeException
     */
    private function parseAndLoadRules() {
        if (!(($this->compactRules->resources ?? null) instanceof \stdClass))
            throw new PikeException('rules->resources must be a \stdClass',
                                    PikeException::BAD_INPUT);
        if (!(($this->compactRules->userPermissions ?? null) instanceof \stdClass))
            throw new PikeException('rules->userPermissions must be a \stdClass',
                                    PikeException::BAD_INPUT);
        $this->resources = $this->compactRules->resources;
        $this->permissions = $this->compactRules->userPermissions;
    }
    /**
     * @return array|string $allowedActions
     * @return \stdClass $resourceActions
     * @return int
     * @throws \Pike\PikeException
     */
    public static function makePermissions($allowedActions, $resourceActions) {
        $flags = 0;
        if ($allowedActions !== '*') {
            foreach ($allowedActions as $actionName) {
                if (($flag = ($resourceActions->$actionName ?? null)))
                    $flags |= $flag;
                else
                    throw new PikeException("`{$actionName}` not found, available: " .
                                            implode(', ', array_keys((array)$resourceActions)),
                                            PikeException::BAD_INPUT);
            }
        } else {
            foreach ($resourceActions as $flag)
                $flags |= $flag;
        }
        return $flags;
    }
}
