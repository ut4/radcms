<?php
use RadCms\Auth\ACL;
//
return function () {
$flag1 = 1 << 1;
$flag2 = 1 << 2;
$flag3 = 1 << 3;
$out = new \stdClass;
$out->resources = (object)[
    'auth' => (object)[
        'logout' => $flag1
    ],
    'content' => (object)[
        'create' => $flag1,
        'view'   => $flag2,
        'update' => $flag3
    ],
    'contentTypes' => (object)[
        'view' => $flag1,
    ],
    'editMode' => (object)[
        'access' => $flag1
    ],
    'multiFieldContent' => (object)[
        'manageFieldsOf' => $flag1
    ],
    'plugins' =>  (object)[
        'view'      => $flag1,
        'install'   => $flag2,
        'uninstall' => $flag3
    ],
    'uploads' => (object)[
        'view'   => $flag1,
        'upload' => $flag2
    ],
    'websites' => (object)[
        'pack' => $flag1
    ]
];
$out->userPermissions = (object)[
    ACL::ROLE_SUPER_ADMIN => (object)[
        'auth'              => ACL::makePermissions('*', $out->resources->auth),
        'content'           => ACL::makePermissions('*', $out->resources->content),
        'contentTypes'      => ACL::makePermissions('*', $out->resources->contentTypes),
        'editMode'          => ACL::makePermissions('*', $out->resources->editMode),
        'multiFieldContent' => ACL::makePermissions('*', $out->resources->multiFieldContent),
        'plugins'           => ACL::makePermissions('*', $out->resources->plugins),
        'uploads'           => ACL::makePermissions('*', $out->resources->uploads),
        'website'           => ACL::makePermissions('*', $out->resources->websites)
    ],
    ACL::ROLE_EDITOR => (object)[
        'auth'              => ACL::makePermissions(['logout'], $out->resources->auth),
        'content'           => ACL::makePermissions(['create','view','update'], $out->resources->content),
        'contentTypes'      => ACL::makePermissions(['view'], $out->resources->contentTypes),
        'editMode'          => ACL::makePermissions(['access'], $out->resources->editMode),
        'multiFieldContent' => 0,
        'plugins'           => 0,
        'uploads'           => ACL::makePermissions(['view','upload'], $out->resources->uploads),
        'website'           => 0
    ],
    ACL::ROLE_VIEWER => (object)[
        'auth' => ACL::makePermissions(['logout'], $out->resources->auth),
    ]
];
return $out;
};