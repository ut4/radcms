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
"    `graph` json"
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

static std::vector<SampleData> sampleData = {
    {
        // name
        "minimal",
        // installSql
        "insert into websites values (1, '{\"pages\":[[\"/\",0,0]],\"templates\":[\"main-layout.jsx.htm\"]}');"
        "insert into componentTypes values (1, 'Generic');"
        "insert into componentTypeProps values (1, 'content', 'richtext', 1);"
        "insert into components values (1, 'footer', '{\"content\":\"(c) 2034 MySite\"}', 1);",
        // files
        {
            {"main-layout.jsx.htm", "@footer = fetchOne(\"Generic\").where(\"name='footer'\")\n"
                                    "<html>\n"
                                    "    <head>\n"
                                    "        <title>Hello</title>\n"
                                    "    </head>\n"
                                    "    <body>\n"
                                    "        <h1>Hello</h1>\n"
                                    "        <footer>{ footer.content }</footer>\n"
                                    "    </body>\n"
                                    "</html>"}
        }
    },
    {
        // name
        "blog",
        // installSql
        "insert into websites values"
        "  (1, '{\"pages\":[[\"/\",0,0],[\"/art1\",0,1],[\"/art2\",0,1],[\"/art3\",0,1]],"
                "\"templates\":[\"main-layout.jsx.htm\",\"article-layout.jsx.htm\"]}');"
        "insert into componentTypes values"
        "  (1, 'Generic'),"
        "  (2, 'Article');"
        "insert into componentTypeProps values"
        "  (1, 'content', 'richtext', 1),"
        "  (2, 'title', 'text', 2),"
        "  (3, 'body', 'richtext', 2);"
        "insert into components values"
        "  (1, 'footer', '{\"content\":\"(c) 2034 MySite\"}', 1),"
        "  (2, 'art1', '{\"title\":\"Article 1\",\"body\":\"Hello from article 1\"}', 2),"
        "  (3, 'art2', '{\"title\":\"Article 2\",\"body\":\"Hello from article 2\"}', 2),"
        "  (4, 'art3', '{\"title\":\"Article 3\",\"body\":\"Hello from article 3\"}', 2);",
        // files
        {
            {"main-layout.jsx.htm", "@arts = fetchAll(\"Article\")\n"
                               "@footer = fetchOne(\"Generic\").where(\"name='footer'\")\n"
                               "<html>\n"
                               "    <head>\n"
                               "        <title>Hello</title>\n"
                               "    </head>\n"
                               "    <body>\n"
                               "        { domTree.createElement(directives.ArticleList, {articles: arts}, null) }\n"
                               "        <footer>{ footer.content }</footer>\n"
                               "    </body>\n"
                               "</html>"},
            {"article-layout.jsx.htm", "@art = fetchOne(\"Article\").where(\"name='\" + url.substr(1) + \"'\")\n"
                                  "@footer = fetchOne(\"Generic\").where(\"name='footer'\")\n"
                                  "<html>\n"
                                  "    <head>\n"
                                  "        <title>{ art.title }</title>\n"
                                  "    </head>\n"
                                  "    <body>\n"
                                  "        <article>\n"
                                  "            <h2>{ art.title }</h2>\n"
                                  "            <div>{ art.body }</div>\n"
                                  "        </article>\n"
                                  "        <footer>{ footer.content }</footer>\n"
                                  "    </body>\n"
                                  "</html>"}
        }
    }
};

const char*
getDbSchemaSql() { 
    return schemaSql;
}

SampleData*
getSampleData(const std::string &name) {
    for (auto &d: sampleData) {
        if (d.name == name) return &d;
    }
    return nullptr;
}
