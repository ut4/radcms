USE ${database};

DROP TABLE IF EXISTS ${p}contentRevisions;
DROP TABLE IF EXISTS ${p}cmsState;
DROP TABLE IF EXISTS ${p}users;

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
