USE ${database};

DROP TABLE IF EXISTS ${p}contentNodes;
DROP TABLE IF EXISTS ${p}contentTypes;
DROP TABLE IF EXISTS ${p}websiteConfigs;

CREATE TABLE ${p}websiteConfigs (
    `id` SMALLINT UNSIGNED NOT NULL AUTO_INCREMENT,
    `name` VARCHAR(127) NOT NULL,
    `layoutMatchers` TEXT,
    PRIMARY KEY (`id`)
) DEFAULT CHARSET = utf8mb4;

CREATE TABLE ${p}contentTypes (
    `id` SMALLINT UNSIGNED NOT NULL AUTO_INCREMENT,
    `name` VARCHAR(78) NOT NULL,
    `fields` TEXT,
    PRIMARY KEY (`id`)
) DEFAULT CHARSET = utf8mb4;

CREATE TABLE ${p}contentNodes (
    `id` SMALLINT UNSIGNED NOT NULL AUTO_INCREMENT,
    `name` VARCHAR(78) NOT NULL,
    `json` TEXT,
    `contentTypeId` SMALLINT UNSIGNED NOT NULL,
    `parent` SMALLINT UNSIGNED DEFAULT NULL,
    FOREIGN KEY(`contentTypeId`) references ${p}contentTypes(`id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARSET = utf8mb4;
CREATE UNIQUE INDEX ${p}contentNodesNameIdx ON ${p}contentNodes(`name`);
