#include "../include/static-data.hpp"

const char *schemaSql =
"drop trigger if exists onUploadStatusesDeleteFileTrigger;"
"drop table if exists uploadStatuses;"
"drop table if exists staticFileResources;"
"drop index if exists contentNodesContentTypeNameIdx;"
"drop index if exists contentNodesNameIdx;"
"drop table if exists contentNodes;"
"drop table if exists websites;"
"create table websites ("
    "`id` integer primary key autoincrement,"
    "`graph` json"
");"
"create table contentNodes ("
    "`id` integer primary key autoincrement,"
    "`name` varchar(32) not null,"
    "`json` json,"
    "contentTypeName varchar(64) not null"
");"
"create unique index contentNodesNameIdx on contentNodes(`name`);"
"create index contentNodesContentTypeNameIdx on contentNodes(`contentTypeName`);"
"create table staticFileResources ("
    "`url` varchar(512) primary key,"
    "`isOk` integer default 0"
");"
"create table uploadStatuses ("
    "`url` varchar(512) primary key,"
    "`curhash` varchar(40) default null," // latest local checksum
    "`uphash` varchar(40) default null," // latest checksum uploaded to the server
    "`isFile` integer default 0" // 0 == page, 1 = file
");"
"create trigger onUploadStatusesDeleteFileTrigger after delete on uploadStatuses "
"when old.isFile = 1 begin "
    "delete from staticFileResources where `url` = old.`url`;"
"end;";

static std::vector<SampleData> sampleData = {
    {
        // name
        "minimal",
        // installSql
        "insert into websites values (1, '{\"pages\":[[\"/home\",\"\",\"main-layout.jsx.htm\",[]]]}');"
        "insert into contentNodes values (1, 'footer', '{\"content\":\"(c) 2034 MySite\"}', 'Generic');"
        "insert into uploadStatuses values ('/home','4e86b8c03bedc235b9ec52f04d55c11f18574b1c',null,0);",
        // files
        {
            {"site.ini", "[Site]\n"
                         "homeUrl=/home\n"
                         "defaultLayout=main-layout.jsx.htm\n\n"
                         "[ContentType:Generic]\n"
                         "content=richtext"},
            {"main-layout.jsx.htm", "@footer = fetchOne(\"Generic\").where(\"name='footer'\").exec()\n"
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
        "  (1, '{\"pages\":[[\"/home\",\"\",\"main-layout.jsx.htm\",[\"/art1\",\"/art2\",\"/art3\"]],"
                           "[\"/art1\",\"\",\"article-layout.jsx.htm\",[]],"
                           "[\"/art2\",\"\",\"article-layout.jsx.htm\",[]],"
                           "[\"/art3\",\"\",\"article-layout.jsx.htm\",[]]]}');"
        "insert into contentNodes values"
        " (1,'footer','{\"content\":\"(c) 2034 MySite\"}','Generic'),"
        " (2,'art1', '{\"title\":\"Article 1\",\"body\":\"Hello from article 1\"}','Article'),"
        " (3,'art2', '{\"title\":\"Article 2\",\"body\":\"Hello from article 2\"}','Article'),"
        " (4,'art3', '{\"title\":\"Article 3\",\"body\":\"Hello from article 3\"}','Article');"
        "insert into uploadStatuses values"
        " ('/home','69140fce68ae230488b2dd8790052da239635f0f',null,0),"
        " ('/art1','b1a32abb186dec98beee7ac8046ba3707f1d4837',null,0),"
        " ('/art2','d07c501d4d239ad675d34a9ec7bacc00d323b474',null,0),"
        " ('/art3','248f99ff331240f99f0a4688bde33b6b6413d2a6',null,0);",
        // files
        {
            {"site.ini", "[Site]\n"
                         "homeUrl=/home\n"
                         "defaultLayout=main-layout.jsx.htm\n\n"
                         "[ContentType:Generic]\n"
                         "content=richtext\n\n"
                         "[ContentType:Article]\n"
                         "title=text\n"
                         "body=richtext"},
            {"main-layout.jsx.htm", "@arts = fetchAll(\"Article\").exec()\n"
                               "@footer = fetchOne(\"Generic\").where(\"name='footer'\").exec()\n"
                               "<html>\n"
                               "    <head>\n"
                               "        <title>Hello</title>\n"
                               "    </head>\n"
                               "    <body>\n"
                               "        <RadArticleList name=\"arts\" articles={arts}/>\n"
                               "        <footer>{ footer.content }</footer>\n"
                               "    </body>\n"
                               "</html>"},
            {"article-layout.jsx.htm", "@art = fetchOne(\"Article\").where(\"name='\" + url[0] + \"'\").exec()\n"
                                  "@footer = fetchOne(\"Generic\").where(\"name='footer'\").exec()\n"
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
