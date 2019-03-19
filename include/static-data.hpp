#pragma once

#include <vector>
#include <string>

struct SampleData {
    std::string name; // eg. "minimal" or "blog"
    std::string installSql; // eg. "insert into contentNodes ..."
    std::string contentTypes; // eg. "[{"name":"Article","fields":[{"name":"title","dataType":"text"}...]}...]"
    std::vector<std::pair<std::string, std::string>> files; // eg. {{"foo.htm","<html>..."}...}
};

const char*
getNamedSql(const std::string &name);

SampleData*
getSampleData(const std::string &name);

std::vector<SampleData>&
getSampleData();
