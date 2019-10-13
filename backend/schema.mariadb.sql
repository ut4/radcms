USE ${database};

DROP TABLE IF EXISTS ${p}websiteConfigs;

CREATE TABLE ${p}websiteConfigs (
    `id` SMALLINT UNSIGNED NOT NULL AUTO_INCREMENT,
    `name` VARCHAR(127) NOT NULL,
    `layoutMatchers` TEXT,
    PRIMARY KEY (`id`)
) DEFAULT CHARSET = utf8mb4;
