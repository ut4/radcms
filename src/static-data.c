#include "../include/static-data.h"

SampleData sampleData[] = {
    {
        .name="minimal",
        .numFiles=1,
        .files=(SampleDataFile[1]){
            {"main-layout.js", "function (ddc, url) {\n"
                               "    ddc.fetchOne('Generic').where('name=\\'footer\\'').to('footer');\n"
                               "    return function (vTree, footer) {\n"
                               "        var e = vTree.registerElement;\n"
                               "        e('html', null, [\n"
                               "            e('head', null,\n"
                               "                e('title', null, 'Hello')\n"
                               "            ),\n"
                               "            e('body', null, [\n"
                               "                e('h1', null, 'Hello'),\n"
                               "                e('footer', null, footer.content)\n"
                               "            ])\n"
                               "        ]);\n"
                               "    };\n"
                               "}"}
        },
        .installSql="insert into websites values (1, '1|1|1/|0|0|main-layout.js');"
                    "insert into componentTypes values (1, 'Generic');"
                    "insert into componentTypeProps values (1, 'content', 'richtext', 1);"
                    "insert into components values (1, 'footer', '{\"content\":\"(c) 2034 MySite\"}', 1);",
        .siteIniContents="[Site]\nfoo=bar"
    },
    {
        .name="blog",
        .numFiles=3,
        .files=(SampleDataFile[3]){
            {"main-layout.js", "function (ddc, url) {\n"
                               "    ddc.fetchAll('Article').to('arts');\n"
                               "    ddc.fetchOne('Generic').where('name=\\'footer\\'').to('footer');\n"
                               "    return function (vTree, arts, footer) {\n"
                               "        var e = vTree.registerElement;\n"
                               "        e('html', null, [\n"
                               "            e('head', null,\n"
                               "                e('title', null, 'Hello')\n"
                               "            ),\n"
                               "            e('body', null, [\n"
                               "                e('div', null, vTree.partial('articles-listing.js', arts)),\n"
                               "                e('footer', null, footer.content)\n"
                               "            ])\n"
                               "        ]);\n"
                               "    };\n"
                               "}"},
            {"articles-listing.js", "function (vTree, articles) {\n"
                                   "    var e = vTree.registerElement;\n"
                                   "    return e('div', null, articles.map(function (article) {\n"
                                   "        return e('article', null, [\n"
                                   "            e('h2', null, article.title),\n"
                                   "            e('p', null,\n"
                                   "                article.body.substr(0, 6) + '... ' +\n"
                                   "                '<a href=\"' + article.cmp.name + '\">Click here man</a>'\n"
                                   "            )\n"
                                   "        ]);\n"
                                   "    }));\n"
                                   "}"},
            {"article-layout.js", "function (ddc, url) {\n"
                               "    ddc.fetchOne('Article').where('name=\\''+url.substr(1)+'\\'').to('art');\n"
                               "    ddc.fetchOne('Generic').where('name=\\'footer\\'').to('footer');\n"
                               "    return function (vTree, art, footer) {\n"
                               "        var e = vTree.registerElement;\n"
                               "        e('html', null, [\n"
                               "            e('head', null,\n"
                               "                e('title', null, art.title)\n"
                               "            ),\n"
                               "            e('body', null, [\n"
                               "                e('article', null, [\n"
                               "                    e('h2', null, art.title),\n"
                               "                    e('div', null, art.body)\n"
                               "                ]),\n"
                               "                e('footer', null, footer.content)\n"
                               "            ])\n"
                               "        ]);\n"
                               "    };\n"
                               "}"}
        },
        .installSql="insert into websites values"
                    "  (1, '4|3|1/|0|0|2/art1|0|2|3/art2|0|2|4/art3|0|2|main-layout.js|articles-listing.js|article-layout.js');"
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
