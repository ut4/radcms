#pragma once

#include <rapidxml.hpp>
#include "duk.hpp"
#include "js-environment-stash.hpp"

/**
 * Implements @native methods of xml-reader.js (
 *    - XmlReader()
 *    - XmlReader.prototype.parse()
 *    - XmlNode.getFirstChild()
 *    - XmlNode.getNextSibling()
 *    - XmlNode.getContent()
 * ) */
void
xmlReaderJsModuleInit(duk_context *ctx, const int exportsIsAt);
