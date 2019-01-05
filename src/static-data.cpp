#include "../include/static-data.hpp"

const char *schemaSql =
"drop table if exists uploadStatuses;"
"drop table if exists staticFileResources;"
"drop index if exists componentNameIdx;"
"drop table if exists components;"
"drop table if exists componentTypeProps;"
"drop index if exists componentTypeNameIdx;"
"drop table if exists componentTypes;"
"drop table if exists websites;"
"create table websites ("
"    `id` integer primary key autoincrement,"
"    `graph` text"
");"
"create table componentTypes ("
"    `id` integer primary key autoincrement,"
"    `name` varchar(64)"
");"
"create unique index componentTypeNameIdx on componentTypes(`name`);"
"create table componentTypeProps ("
"    `id` integer primary key autoincrement,"
"    `key` varchar(32) not null,"
"    `contentType` varchar(8) not null," // -- text, richtext
"    componentTypeId integer not null,"
"    foreign key (componentTypeId) references componentTypes(id)"
");"
"create table components ("
"    `id` integer primary key autoincrement,"
"    `name` varchar(32) not null,"
"    `json` json,"
"    componentTypeId integer not null,"
"    foreign key (componentTypeId) references componentTypes(id)"
");"
"create unique index componentNameIdx on components(`name`);"
"create table staticFileResources ("
"    `url` varchar(512) primary key"
");"
"create table uploadStatuses ("
"    `url` varchar(512) primary key,"
"    `hash` varchar(32) default null,"
"    `status` integer default 0" // 0 = not uploaded, 1 = uploaded but outdated, 2 = uploaded
");";

const char*
getDbSchemaSql() { 
    return schemaSql;
}

