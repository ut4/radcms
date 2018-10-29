#include "../include/static-data.h"

#define FOOTER_TMPL "function (vTree, cmp, url) {\n" \
                    "    var e = vTree.registerElement;\n" \
                    "    e('footer', null, cmp.data.content);\n" \
                    "}"

SampleData sampleData[] = {
    {
        .name="minimal",
        .numFiles=2,
        .files=(SampleDataFile[2]){
            {"main-layout.js", "function (vTree, ddc, url) {\n"
                               "    var e = vTree.registerElement;\n"
                               "    e('html', null, [\n"
                               "        e('head', null,\n"
                               "            e('title', null, 'Hello')\n"
                               "        ),\n"
                               "        e('body', null, [\n"
                               "            e('h1', null, 'Hello'),\n"
                               "            e('div', null, ddc.renderOne('Generic').where('name=\\'footer\\'').using('footer.js'))\n"
                               "        ])\n"
                               "    ]);\n"
                               "}"},
            {"footer.js", FOOTER_TMPL}
        },
        .installSql="insert into websites values (1, '1|2|1/|0|main-layout.js|main-layout.js|footer.js');"
                    "insert into componentTypes values (1, 'Generic');"
                    "insert into componentTypeProps values (1, 'content', 'richtext', 1);"
                    "insert into components values (1, 'footer', '{\"content\":\"(c) 2034 MySite\"}', 1);",
        .siteIniContents="[Site]\nfoo=bar"
    },
    {
        .name="blog",
        .numFiles=5,
        .files=(SampleDataFile[5]){
            {"main-layout.js", "function (vTree, ddc, url) {\n"
                               "    var e = vTree.registerElement;\n"
                               "    e('html', null, [\n"
                               "        e('head', null,\n"
                               "            e('title', null, 'Hello')\n"
                               "        ),\n"
                               "        e('body', null, [\n"
                               "            e('h1', null, 'Hello'),\n"
                               "            ddc.renderAll('Article').using('articles-listing.js'),\n"
                               "            ddc.renderOne('Generic').where('name=\\'footer\\'').using('footer.js')\n"
                               "        ])\n"
                               "    ]);\n"
                               "}"},
            {"article-layout.js", "function (vTree, ddc, url) {\n"
                               "    var e = vTree.registerElement;\n"
                               "    e('html', null, [\n"
                               "        e('head', null,\n"
                               "            e('title', null, 'Hello article')\n"
                               "        ),\n"
                               "        e('body', null, [\n"
                               "            e('h1', null, 'Hello article'),\n"
                               "            ddc.renderOne('Article').where('name=\\''+url.substr(1)+'\\'').using('article-single.js'),\n"
                               "            ddc.renderOne('Generic').where('name=\\'footer\\'').using('footer.js')\n"
                               "        ])\n"
                               "    ]);\n"
                               "}"},
            {"articles-listing.js", "function (vTree, cmps, url) {\n"
                                    "    var e = vTree.registerElement;\n"
                                    "    e('div', null, cmps.map(function (cmp) {\n"
                                    "        return e('article', null, [\n"
                                    "            e('h2', null, cmp.data.title),\n"
                                    "            e('p', null,\n"
                                    "                cmp.data.body.substr(0, 6) + '... ' +\n"
                                    "                '<a href=\"' + cmp.name + '\">Click here man</a>'\n"
                                    "            )\n"
                                    "        ]);\n"
                                    "    }));\n"
                                    "}"},
            {"article-single.js", "function (vTree, cmp, url) {\n"
                                  "    var e = vTree.registerElement;\n"
                                  "    e('article', null, [\n"
                                  "        e('h2', null, cmp.data.title),\n"
                                  "        e('div', null, cmp.data.body)\n"
                                  "    ]);\n"
                                  "}"},
            {"footer.js", FOOTER_TMPL}
        },
        .installSql="insert into websites values"
                    "  (1, '4|5|1/|0|main-layout.js|2/art1|0|article-layout.js|3/art2|0|article-layout.js|4/art3|0|article-layout.js|main-layout.js|article-layout.js|article-single.js|articles-listing.js|footer.js');"
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
        .siteIniContents="[Site]\nfoo=bar"
    }
};

const char *schemaSql =
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
"create unique index componentNameIdx on components(`name`);";

SampleData*
getSampleData(unsigned index) {
    if (index > 1) return (void*)0;
    return &sampleData[index];
}

const char*
getDbSchemaSql() { 
    return schemaSql;
}
