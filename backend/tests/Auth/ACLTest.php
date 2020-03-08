<?php

namespace RadCms\Tests\Auth;

use PHPUnit\Framework\TestCase;
use RadCms\Auth\ACL;

final class ACLTest extends TestCase {
    public function testCanDisallowsEverythingByDefault() {
        $resources = (object)[
            'res1' => (object)['action1' => 1<<1]
        ];
        $userPermissions = (object)[
            'user1' => (object)['res1' => 0],
            'suer2' => null
        ];
        $acl = $this->createAcl($resources, $userPermissions);
        $this->assertEquals(false, $acl->can('user1', 'action1', 'res1'));
        $this->assertEquals(false, $acl->can('user2', 'action1', 'res1'));
        $this->assertEquals(false, $acl->can('nouser', 'action1', 'res1'));
    }

    ////////////////////////////////////////////////////////////////////////////

    public function testCanAllowsOnlyWhenUserhasPermission() {
        $resources = (object)[
            'res1' => (object)[
                'action1' => 1 << 1,
                'action2' => 1 << 2,
                'action3' => 1 << 3
            ]
        ];
        $acl = $this->createAclAndPermit(0, $resources);
        $this->assertEquals(false, $acl->can('user1', 'action1', 'res1'));
        $this->assertEquals(false, $acl->can('user1', 'action2', 'res1'));
        $this->assertEquals(false, $acl->can('user1', 'action3', 'res1'));
        //
        $acl2 = $this->createAclAndPermit(0 | (1 << 2), $resources);
        $this->assertEquals(false, $acl2->can('user1', 'action1', 'res1'));
        $this->assertEquals(true,  $acl2->can('user1', 'action2', 'res1'));
        $this->assertEquals(false, $acl2->can('user1', 'action3', 'res1'));
        //
        $acl3 = $this->createAclAndPermit(0 | (1 << 1) | (1 << 3), $resources);
        $this->assertEquals(true,  $acl3->can('user1', 'action1', 'res1'));
        $this->assertEquals(false, $acl3->can('user1', 'action2', 'res1'));
        $this->assertEquals(true,  $acl3->can('user1', 'action3', 'res1'));
    }
    private function createAclAndPermit($permissions, $resources) {
        $acl = $this->createAcl($resources,
                                (object)['user1' => (object)[
                                    'res1' => $permissions
                                ]]);
        return $acl;
    }
    private function createAcl($resources, $userPermissions) {
        $out = new ACL;
        $out->setRules((object)['resources' => $resources,
                                'userPermissions' => $userPermissions]);
        return $out;
    }
}
