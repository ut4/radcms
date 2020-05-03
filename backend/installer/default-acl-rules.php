<?php
use RadCms\Auth\ACL;
//
return function () {
$flag1 = 1 << 1;
$flag2 = 1 << 2;
$flag3 = 1 << 3;
$out = new \stdClass;
$out->resources = (object) [
    'auth' => (object) [
        'logout'     => $flag1,
        'updatePass' => $flag2,
    ],
    'content' => (object) [
        'create'    => $flag1,
        'view'      => $flag2,
        'update'    => $flag3,
        'delete'    => 1 << 4,
        'configure' => 1 << 5,
    ],
    'contentTypes' => (object) [
        'create'      => $flag1,
        'view'        => $flag2,
        'update'      => $flag3,
        'delete'      => 1 << 4,
        'addField'    => 1 << 5,
        'updateField' => 1 << 6,
        'deleteField' => 1 << 7,
    ],
    'editMode' => (object) [
        'access' => $flag1
    ],
    'multiFieldContent' => (object) [
        'manageFieldsOf' => $flag1
    ],
    'plugins' => (object) [
        'view'      => $flag1,
        'install'   => $flag2,
        'uninstall' => $flag3
    ],
    'profile' => (object) [
        'viewItsOwn' => $flag1,
    ],
    'uploads' => (object) [
        'view'   => $flag1,
        'upload' => $flag2
    ],
    'websites' => (object) [
        'pack'    => $flag1,
        'prePack' => $flag2,
    ]
];
$out->userPermissions = (object) [
    ACL::ROLE_SUPER_ADMIN => (object) [
        'auth'              => ACL::makePermissions('*', $out->resources->auth),
        'content'           => ACL::makePermissions('*', $out->resources->content),
        'contentTypes'      => ACL::makePermissions('*', $out->resources->contentTypes),
        'editMode'          => ACL::makePermissions('*', $out->resources->editMode),
        'multiFieldContent' => ACL::makePermissions('*', $out->resources->multiFieldContent),
        'plugins'           => ACL::makePermissions('*', $out->resources->plugins),
        'profile'           => ACL::makePermissions('*', $out->resources->profile),
        'uploads'           => ACL::makePermissions('*', $out->resources->uploads),
        'websites'          => ACL::makePermissions('*', $out->resources->websites)
    ],
    ACL::ROLE_EDITOR => (object) [
        'auth'              => ACL::makePermissions(['logout'], $out->resources->auth),
        'content'           => ACL::makePermissions(['create','view','update'], $out->resources->content),
        'contentTypes'      => ACL::makePermissions(['view'], $out->resources->contentTypes),
        'editMode'          => ACL::makePermissions(['access'], $out->resources->editMode),
        'multiFieldContent' => ACL::NO_PERMISSIONS,
        'plugins'           => ACL::NO_PERMISSIONS,
        'profile'           => ACL::makePermissions(['viewItsOwn'], $out->resources->profile),
        'uploads'           => ACL::makePermissions(['view','upload'], $out->resources->uploads),
        'websites'          => ACL::NO_PERMISSIONS
    ],
    ACL::ROLE_VIEWER => (object) [
        'auth' => ACL::makePermissions(['logout'], $out->resources->auth),
    ]
];
return $out;
};
