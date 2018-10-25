#ifndef insn_staticData_h
#define insn_staticData_h

typedef struct {
    const char *name; // eg. "foo.js"
    const char *contents; // eg. "function (vTree...) { ... }"
} SampleDataFile;

typedef struct {
    const char *name; // eg. "minimal" or "blog"
    unsigned numFiles;
    const SampleDataFile *files; // An array of files
    const char *installSql; // eg. "insert into componentTypes ..."
    const char *siteIniContents;
} SampleData;

SampleData*
getSampleData(unsigned index);

const char*
getDbSchemaSql();

#endif