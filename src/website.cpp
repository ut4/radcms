#include "../include/website.hpp"

bool
websiteInstall(const std::string &sitePath, SampleData *sampleData, Db *db,
               std::string &err) {
    /**
     * 1. Create the db schema
     */
    if (!db->runInTransaction(getDbSchemaSql(), err)) return false;
    /**
     * 2. Insert sample data
     */
    if (!db->runInTransaction(sampleData->installSql, err)) return false;
    /**
     * 3. Write the layout-files & template-files.
     */
    for (const auto &file: sampleData->files) {
        if (!myFsWrite(sitePath + file.first, file.second, err)) {
            return false;
        }
    }
    return true;
}
