#pragma once

#include <vector>
#include <string>

struct SampleData {
    std::string name; // eg. "minimal" or "blog"
    std::string installSql; // eg. "insert into components ..."
    std::vector<std::pair<std::string, std::string>> files; // eg. {{"foo.htm","<html>..."}...}
};

const char*
getDbSchemaSql();

SampleData*
getSampleData(const std::string &name);
