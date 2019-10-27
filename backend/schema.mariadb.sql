USE ${database};

DROP TABLE IF EXISTS ${p}websiteState;

CREATE TABLE ${p}websiteState (
    `id` SMALLINT UNSIGNED NOT NULL AUTO_INCREMENT,
    `name` VARCHAR(127) NOT NULL,
    `layoutMatchers` JSON,        -- [{"pattern":".*","layoutFileName":"main-layout.tmpl.php"} ...]
    `installedContentTypes` JSON, -- {"Name": ["friendlyName", {"key": "datatype" ...}], "Another": [...]}
    `installedContentTypesLastUpdated` VARCHAR(11) DEFAULT NULL,
    `installedPlugins` JSON,      -- {"Name": 1, "Another": 1 ...}
    PRIMARY KEY (`id`)
) DEFAULT CHARSET = utf8mb4;

INSERT INTO ${p}websiteState VALUES
(1, '${siteName}', '[]', '{}', NULL, '{}');
