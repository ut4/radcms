const mainDbSchemaSql =
"drop table if exists websites;" +
"create table websites (" +
    "`id` integer primary key autoincrement," +
    "`dirPath` varchar(512)," +
    "`name` varchar(128) default null," +
    "`createdAt` datetime default (strftime('%s', \'now\'))" +
");";

const websiteDbSchemaSql =
"drop trigger if exists onUploadStatusesDeleteFileTrigger;" +
"drop table if exists uploadStatuses;" +
"drop table if exists assetFileRefs;" +
"drop table if exists assetFiles;" +
"drop index if exists contentNodesNameIdx;" +
"drop table if exists contentNodes;" +
"drop table if exists contentTypes;" +
"drop table if exists self;" +
"create table self (" +
    "`id` integer primary key autoincrement," +
    "`graph` json" +
");" +
"create table contentTypes (" +
    "`id` integer primary key autoincrement," +
    "`name` varchar(78) not null," +
    "`fields` json" +
");" +
"create table contentNodes (" +
    "`id` integer primary key autoincrement," +
    "`name` varchar(78) not null," +
    "`json` json," +
    "contentTypeId integer not null," +
    "foreign key(contentTypeId) references contentTypes(`id`)" +
");" +
"create unique index contentNodesNameIdx on contentNodes(`name`);" +
"create table assetFiles (" +
    "`url` varchar(512) primary key" +
");" +
"create table assetFileRefs (" +
    "`fileUrl` varchar(512) not null," + // url from css/js/img element
    "`userUrl` varchar(512) not null," + // url of the page where the $fileUrl element was found
    "primary key (`fileUrl`, `userUrl`)" +
");" +
"create table uploadStatuses (" +
    "`url` varchar(512) primary key," +
    "`curhash` varchar(40) default null," + // latest local checksum
    "`uphash` varchar(40) default null," + // latest checksum uploaded to the server
    "`isFile` integer default 0" + // 0 == page, 1 = file
");" +
"create trigger onUploadStatusesDeleteFileTrigger after delete on uploadStatuses " +
"when old.`isFile` = 1 begin " +
    "delete from assetFiles where `url` = old.`url`;" +
"end;";

const genericContentType = {name: 'Generic blobs', fields: {content: 'richtext'}};
const articleContentType = {name: 'Articles', fields: {title: 'text', body: 'richtext'}};

const sampleData = [
    {
        name: "minimal",
        installSql:
        "insert into self values (1, '{\"pages\":[[\"/home\",\"\",\"main-layout.jsx.htm\",[]]]}');" +
        "insert into contentTypes values " +
            "(1, '"+genericContentType.name+"', '"+JSON.stringify(genericContentType.fields)+"');" +
        "insert into contentNodes values (1, 'footer', '{\"content\":\"(c) 2034 MySite\"}', 1);" +
        "insert into uploadStatuses values ('/home','4e86b8c03bedc235b9ec52f04d55c11f18574b1c',null,0);",
        contentTypes: [genericContentType],
        files: {
            "site.ini": "[Site]\n" +
                        "homeUrl=/home\n" +
                        "defaultLayout=main-layout.jsx.htm",
            "main-layout.jsx.htm": "const footer = fetchOne(\"Generic blobs\").where(\"name='footer'\").exec()\n" +
                                   "<html>\n" +
                                   "    <head>\n" +
                                   "        <title>Hello</title>\n" +
                                   "    </head>\n" +
                                   "    <body>\n" +
                                   "        <h1>Hello</h1>\n" +
                                   "        <footer>{ footer.content }</footer>\n" +
                                   "    </body>\n" +
                                   "</html>"
        }
    },
    {
        name: "blog",
        installSql:
        "insert into self values" +
        "  (1, '{\"pages\":[[\"/home\",\"\",\"main-layout.jsx.htm\",[\"/art1\",\"/art2\",\"/art3\"]]," +
                           "[\"/art1\",\"\",\"article-layout.jsx.htm\",[]]," +
                           "[\"/art2\",\"\",\"article-layout.jsx.htm\",[]]," +
                           "[\"/art3\",\"\",\"article-layout.jsx.htm\",[]]]}');" +
        "insert into contentTypes values " +
            "(1, '"+genericContentType.name+"', '"+JSON.stringify(genericContentType.fields)+"')," +
            "(2, '"+articleContentType.name+"', '"+JSON.stringify(articleContentType.fields)+"');" +
        "insert into contentNodes values" +
        " (1,'footer','{\"content\":\"(c) 2034 MySite\"}',1)," +
        " (2,'art1', '{\"title\":\"Article 1\",\"body\":\"Hello from article 1\"}',2)," +
        " (3,'art2', '{\"title\":\"Article 2\",\"body\":\"Hello from article 2\"}',2)," +
        " (4,'art3', '{\"title\":\"Article 3\",\"body\":\"Hello from article 3\"}',2);" +
        "insert into uploadStatuses values" +
        " ('/home','4ae24f946f140ea08f6c365eeb6d596f1c9764f5',null,0)," +
        " ('/art1','b1a32abb186dec98beee7ac8046ba3707f1d4837',null,0)," +
        " ('/art2','d07c501d4d239ad675d34a9ec7bacc00d323b474',null,0)," +
        " ('/art3','248f99ff331240f99f0a4688bde33b6b6413d2a6',null,0);",
        contentTypes: [genericContentType, articleContentType],
        files: {
            "site.ini": "[Site]\n" +
                        "homeUrl=/home\n" +
                        "defaultLayout=main-layout.jsx.htm",
            "main-layout.jsx.htm": "const [arts, footer] = fetchAll(\"Articles\")\n" +
                                   "                       .fetchOne(\"Generic blobs\").where(\"name='footer'\").exec()\n" +
                                   "<html>\n" +
                                   "    <head>\n" +
                                   "        <title>Hello</title>\n" +
                                   "    </head>\n" +
                                   "    <body>\n" +
                                   "        <RadArticleList articles={arts}/>\n" +
                                   "        <footer>{ footer.content }</footer>\n" +
                                   "    </body>\n" +
                                   "</html>",
            "article-layout.jsx.htm": "const [art, footer] = fetchOne(\"Articles\").where(\"name='\" + url[0] + \"'\")\n" +
                                      "                      .fetchOne(\"Generic blobs\").where(\"name='footer'\").exec()\n" +
                                      "<html>\n" +
                                      "    <head>\n" +
                                      "        <title>{ art.title }</title>\n" +
                                      "    </head>\n" +
                                      "    <body>\n" +
                                      "        <article>\n" +
                                      "            <h2>{ art.title }</h2>\n" +
                                      "            <div>{ art.body }</div>\n" +
                                      "        </article>\n" +
                                      "        <footer>{ footer.content }</footer>\n" +
                                      "    </body>\n" +
                                      "</html>"
        }
    }
];

exports.getNamedSql = name => {
    if (name === ':mainSchema:') {
        return mainDbSchemaSql;
    } else if (name === ':websiteSchema:') {
        return websiteDbSchemaSql;
    }
    // ":blogSampleData:", ":minimalSampleData:" etc.
    const s = sampleData.find(s => name.indexOf(s.name) === 1);
    return s ? s.installSql : undefined;
};

exports.getSampleData = name => {
    if (!name) return sampleData;
    return sampleData.find(s => s.name === name);
};
