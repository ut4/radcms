USE ${database};

DROP TABLE IF EXISTS ${p}files;
DROP TABLE IF EXISTS ${p}contentRevisions;
DROP TABLE IF EXISTS ${p}cmsState;
DROP TABLE IF EXISTS ${p}users;

CREATE TABLE ${p}users (
    `id` CHAR(36) NOT NULL,
    `username` VARCHAR(42) NOT NULL UNIQUE,
    `email` VARCHAR(191) NOT NULL UNIQUE, -- 191 * 4 = 767 bytes = max key length
    `passwordHash` VARCHAR(255) NOT NULL,
    `role` MEDIUMINT(8) UNSIGNED NOT NULL DEFAULT 8388608, -- 1 << 23
    `accountStatus` TINYINT(1) UNSIGNED DEFAULT 1, -- 0=activated, 1=unactivated, 2=banned
    `accountCreatedAt` INT(10) UNSIGNED DEFAULT 0,
    --
    `activationKey` VARCHAR(512) DEFAULT NULL,
    `resetKey` VARCHAR(512) DEFAULT NULL,
    `resetRequestedAt` INT(10) UNSIGNED DEFAULT 0,
    `loginId` CHAR(32) DEFAULT NULL,
    `loginIdValidatorHash` CHAR(64) DEFAULT NULL,
    `loginData` TEXT,
    PRIMARY KEY (`id`)
) DEFAULT CHARSET = utf8mb4;

CREATE TABLE ${p}cmsState (
    `id` SMALLINT UNSIGNED NOT NULL AUTO_INCREMENT,
    `name` VARCHAR(127) NOT NULL,
    `lang` VARCHAR(12) NOT NULL,
    `installedContentTypes` JSON, -- [{"name": "Name", "fields": [{"name": "title" ...}, ...] ...}, ...]
    `installedContentTypesLastUpdated` INT(10) UNSIGNED DEFAULT NULL,
    `installedPlugins` JSON,      -- {"Name": 1, "Another": 1 ...}
    `aclRules` JSON,              -- {"resources": {}, "userPermissions": {}}
    PRIMARY KEY (`id`)
) DEFAULT CHARSET = utf8mb4;

CREATE TABLE ${p}contentRevisions (
    `id` INT UNSIGNED NOT NULL AUTO_INCREMENT,
    `contentId` INT UNSIGNED NOT NULL,
    `contentType` VARCHAR(64) NOT NULL,
    `snapshot` JSON,
    `isCurrentDraft` TINYINT(1) UNSIGNED DEFAULT 0,
    `createdAt` INT(10) UNSIGNED,
    PRIMARY KEY (`id`)
) DEFAULT CHARSET = utf8mb4;

CREATE TABLE ${p}files (
    `fileName` VARCHAR(127) NOT NULL, -- e.g. 'a-cat.png'
    `basePath` VARCHAR(260) NOT NULL, -- e.g. '/var/www/html/uploads/'
    `mime` VARCHAR(255) NOT NULL,
    `friendlyName` VARCHAR(64) DEFAULT NULL,
    `createdAt` INT(10) UNSIGNED DEFAULT 0,
    `updatedAt` INT(10) UNSIGNED DEFAULT 0,
    PRIMARY KEY (`fileName`, `basePath`)
) DEFAULT CHARSET = utf8mb4;
