CREATE TABLE ${p}users (
    `id` CHAR(36) NOT NULL,
    `username` VARCHAR(42) NOT NULL UNIQUE,
    `email` VARCHAR(191) NOT NULL UNIQUE, -- 191 * 4 = 767 bytes = max key length
    `passwordHash` VARCHAR(255) NOT NULL,
    `role` TINYINT(1) UNSIGNED NOT NULL DEFAULT 255,
    `resetKey` VARCHAR(512) DEFAULT NULL,
    `resetRequestedAt` INT(10) UNSIGNED DEFAULT NULL,
    PRIMARY KEY (`id`)
) DEFAULT CHARSET = utf8mb4;

CREATE TABLE ${p}cmsState (
    `id` SMALLINT UNSIGNED NOT NULL AUTO_INCREMENT,
    `name` VARCHAR(127) NOT NULL,
    `lang` VARCHAR(12) NOT NULL,
    `installedContentTypes` JSON, -- {"Name": ["friendlyName", {"key": "datatype" ...}], "Another": [...]}
    `installedContentTypesLastUpdated` INT(10) UNSIGNED DEFAULT NULL,
    `installedPlugins` JSON,      -- {"Name": 1, "Another": 1 ...}
    `aclRules` JSON,              -- {"resources": {}, "userPermissions": {}}
    PRIMARY KEY (`id`)
) DEFAULT CHARSET = utf8mb4;

CREATE TABLE ${p}contentRevisions (
    `contentId` INT UNSIGNED NOT NULL,
    `contentType` VARCHAR(64) NOT NULL,
    `revisionSnapshot` JSON,
    `createdAt` INT(10) UNSIGNED,
    PRIMARY KEY (`contentId`, `contentType`)
) DEFAULT CHARSET = utf8mb4;

INSERT INTO ${p}cmsState VALUES
(1,'Test site','fi_FI','{}',NULL,'{}','{"resources":{"auth":{"logout":2},"content":{"create":2,"view":4,"update":8},"contentTypes":{"view":2},"editMode":{"access":2},"multiFieldContent":{"manageFieldsOf":2},"plugins":{"view":2,"install":4,"uninstall":8},"profile":{"viewItsOwn":2},"uploads":{"view":2,"upload":4},"websites":{"pack":2}},"userPermissions":{"0":{"auth":2,"content":14,"contentTypes":2,"editMode":2,"multiFieldContent":2,"plugins":14,"profile":2,"uploads":6,"websites":2},"1":{"auth":2,"content":14,"contentTypes":2,"editMode":2,"multiFieldContent":0,"plugins":0,"profile":2,"uploads":6,"websites":0},"255":{"auth":2}}}');
