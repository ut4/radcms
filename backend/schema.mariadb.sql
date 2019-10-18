USE ${database};

DROP TABLE IF EXISTS ${p}websiteState;

CREATE TABLE ${p}websiteState (
    `id` SMALLINT UNSIGNED NOT NULL AUTO_INCREMENT,
    `name` VARCHAR(127) NOT NULL,
    `layoutMatchers` TEXT,
    `activeContentTypes` TEXT,
    `installedPlugins` TEXT,
    PRIMARY KEY (`id`)
) DEFAULT CHARSET = utf8mb4;

INSERT INTO ${p}websiteState VALUES
(1, '${siteName}', '', '', '[]');
