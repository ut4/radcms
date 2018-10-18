drop index if exists componentNameIdx;
drop table if exists components;
drop table if exists componentTypeProps;
drop index if exists componentTypeNameIdx;
drop table if exists componentTypes;
drop table if exists websites;

-- Schema
create table websites (
    `id` integer primary key autoincrement,
    `graph` text
);

create table componentTypes (
    `id` integer primary key autoincrement,
    `name` varchar(64)
);
create unique index componentTypeNameIdx on componentTypes(`name`);

create table componentTypeProps (
    `id` integer primary key autoincrement,
    `key` varchar(32) not null,
    `contentType` varchar(8) not null, -- text, richtext
    componentTypeId integer not null,
    foreign key (componentTypeId) references componentTypes(id)
);

create table components (
    `id` integer primary key autoincrement,
    `name` varchar(32) not null,
    `json` json,
    componentTypeId integer not null,
    foreign key (componentTypeId) references componentTypes(id)
);
create unique index componentNameIdx on components(`name`);

-- Default data
insert into websites values
    (1, "4|1/|0|main-layout.js|2/art1|0|article-single.js|3/art2|0|article-single.js|4/art3|article-single.js|0");

insert into componentTypes values
    (1, "Generic"),
    (2, "Article");

insert into componentTypeProps values
    (1, "content", "richtext", 1),
    (2, "title", "text", 2),
    (3, "body", "richtext", 2);

insert into components values
    (1, "Footer", '{"content":"(c) 2034 MySite"}', 1),
    (2, "Art1", '{"title":"Article 1","body":"Hello from article 1"}', 2),
    (3, "Art2", '{"title":"Article 2","body":"Hello from article 2"}', 2),
    (4, "Art3", '{"title":"Article 3","body":"Hello from article 3"}', 2);