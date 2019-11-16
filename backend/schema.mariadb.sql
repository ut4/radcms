USE ${database};

DROP TABLE IF EXISTS ${p}contentRevisions;
DROP TABLE IF EXISTS ${p}websiteState;
DROP TABLE IF EXISTS ${p}users;

CREATE TABLE ${p}users (
    `id` CHAR(36) NOT NULL,
    `username` VARCHAR(42) NOT NULL UNIQUE,
    `email` VARCHAR(191) NOT NULL UNIQUE, -- 191 * 4 = 767 bytes = max key length
    `passwordHash` VARCHAR(255) NOT NULL,
    PRIMARY KEY (`id`)
) DEFAULT CHARSET = utf8mb4;

CREATE TABLE ${p}websiteState (
    `id` SMALLINT UNSIGNED NOT NULL AUTO_INCREMENT,
    `name` VARCHAR(127) NOT NULL,
    `lang` VARCHAR(12) NOT NULL,
    `installedContentTypes` JSON, -- {"Name": ["friendlyName", {"key": "datatype" ...}], "Another": [...]}
    `installedContentTypesLastUpdated` VARCHAR(11) DEFAULT NULL,
    `installedPlugins` JSON,      -- {"Name": 1, "Another": 1 ...}
    PRIMARY KEY (`id`)
) DEFAULT CHARSET = utf8mb4;

CREATE TABLE ${p}contentRevisions (
    `contentId` INT UNSIGNED NOT NULL,
    `contentType` VARCHAR(64) NOT NULL,
    `revisionSnapshot` JSON,
    `createdAt` VARCHAR(11),
    PRIMARY KEY (`contentId`, `contentType`)
) DEFAULT CHARSET = utf8mb4;

INSERT INTO ${p}websiteState VALUES
(1, '${siteName}', '${siteLang}', '{}', NULL, '{}');
