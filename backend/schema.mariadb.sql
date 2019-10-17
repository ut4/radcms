USE ${database};

DROP TABLE IF EXISTS ${p}websiteConfigs;

CREATE TABLE ${p}websiteConfigs (
    `id` SMALLINT UNSIGNED NOT NULL AUTO_INCREMENT,
    `name` VARCHAR(127) NOT NULL,
    `layoutMatchers` TEXT,
    `activeContentTypes` TEXT,
    PRIMARY KEY (`id`)
) DEFAULT CHARSET = utf8mb4;

INSERT INTO ${p}websiteConfigs VALUES
(1, '${siteName}', '', '');
