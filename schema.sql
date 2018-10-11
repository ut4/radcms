DROP TABLE IF EXISTS websites;

-- Schema
CREATE TABLE websites (
    `id` INTEGER PRIMARY KEY AUTOINCREMENT,
    `graph` TEXT
);

-- Default data
INSERT INTO websites VALUES
    (1, "4|1/|0|main-layout.lua|2/art1|0|article-single.lua|3/art2|0|article-single.lua|4/art3|article-single.lua|0");