<?php
use RadCms\Auth\ACL;
//
return function () {
$out = new \stdClass;
$out->resources = (object) [
    'auth' => (object) [
        'logout'     => 0b00000010,
        'updatePass' => 0b00000100,
    ],
    'cms' => (object) [
        'update' => 0b00000010,
    ],
    'content' => (object) [
        'create'    => 0b00000010,
        'view'      => 0b00000100,
        'update'    => 0b00001000,
        'delete'    => 0b00010000,
        'configure' => 0b00100000,
    ],
    'contentTypes' => (object) [
        'create'      => 0b00000010,
        'view'        => 0b00000100,
        'update'      => 0b00001000,
        'delete'      => 0b00010000,
        'addField'    => 0b00100000,
        'updateField' => 0b01000000,
        'deleteField' => 0b10000000,
    ],
    'editMode' => (object) [
        'access' => 0b00000010
    ],
    'multiFieldContent' => (object) [
        'manageFieldsOf' => 0b00000010
    ],
    'plugins' => (object) [
        'view'      => 0b00000010,
        'install'   => 0b00000100,
        'uninstall' => 0b00001000
    ],
    'profile' => (object) [
        'viewItsOwn' => 0b00000010,
    ],
    'uploads' => (object) [
        'view'         => 0b00000010,
        'upload'       => 0b00000100,
        'delete'       => 0b00001000,
        'rebuildIndex' => 0b00010000,
    ],
    'websites' => (object) [
        'pack'    => 0b00000010,
        'prePack' => 0b00000100,
    ]
];
$out->userPermissions = (object) [
    ACL::ROLE_SUPER_ADMIN => (object) [
        'auth'              => ACL::makePermissions('*', $out->resources->auth),
        'content'           => ACL::makePermissions('*', $out->resources->content),
        'cms'               => ACL::makePermissions('*', $out->resources->cms),
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
        'cms'               => ACL::makePermissions('*', $out->resources->cms),
        'contentTypes'      => ACL::makePermissions(['view'], $out->resources->contentTypes),
        'editMode'          => ACL::makePermissions(['access'], $out->resources->editMode),
        'multiFieldContent' => ACL::NO_PERMISSIONS,
        'plugins'           => ACL::NO_PERMISSIONS,
        'profile'           => ACL::makePermissions(['viewItsOwn'], $out->resources->profile),
        'uploads'           => ACL::makePermissions(['view','upload','delete'], $out->resources->uploads),
        'websites'          => ACL::NO_PERMISSIONS
    ],
    ACL::ROLE_VIEWER => (object) [
        'auth' => ACL::makePermissions(['logout'], $out->resources->auth),
    ]
];
return $out;
};
