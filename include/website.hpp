#pragma once

#include "db.hpp"
#include "my-fs.hpp"
#include "static-data.hpp"

/**
 * Creates or overwrites $sitePath + "data.db" with $sampleData->installSql, and
 * creates or overwrites $sampleData->files to $sitePath + $fileName.
 */
bool
websiteInstall(const std::string &sitePath, SampleData *sampleData, Db *db,
               std::string &err);
