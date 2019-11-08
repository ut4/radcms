<?php

namespace RadCms\Website;

use RadCms\ContentType\ContentTypeCollection;

class SiteConfigDiffer {
    /**
     * @param \RadCms\ContentType\ContentTypeCollection $fromFile
     * @param \RadCms\ContentType\ContentTypeCollection $fromDb
     * @return array [(object)['added' => [], 'deleted' => []], (object)['added' => [], 'deleted' => [], 'dataTypeChanged' => []]]
     */
    public function run(ContentTypeCollection $fromFile,
                        ContentTypeCollection $fromDb) {
        $ctypesDiff = (object)['added' => new ContentTypeCollection(),
                               'deleted' => new ContentTypeCollection()];
        $fieldsDiff = (object)['added' => [], 'deleted' => [], 'dataTypeChanged' => []];
        foreach ($fromFile->toArray() as $new) {
            $current = $fromDb->find($new->name);
            if (!$current)
                $ctypesDiff->added->add($new);
            else
                $this->diffFields($new->fields, $current->fields, $fieldsDiff);
        }
        foreach ($fromDb->toArray() as $ctype) {
            if (!$fromFile->find($ctype->name))
                $ctypesDiff->deleted->add($ctype);
        }
        return [$ctypesDiff, $fieldsDiff];
    }
    /**
     * @param object $fromFile ['name' => 'dataType' ...]
     * @param object $froDb ['name' => 'dataType' ...]
     * @param object &$out ['added' => array, 'dataTypeChanged' => array]
     */
    private function diffFields($fromFile, $fromDb, &$out) {
        foreach ($fromFile as $name => $f) {
            $current = $fromDb[$name] ?? null;
            if (!$current)
                $out->added[] = (object)['name' => $name,
                                         'dataType' => $f->dataType,
                                         'widget' => $f->widget];
            elseif ($f->dataType != $current->dataType)
                $out->dataTypeChanged[] = (object)['name' => $name,
                                                   'oldDataType' => $current->dataType,
                                                   'newDataType' => $f->dataType];
        }
        foreach ($fromDb as $name => $_) {
            if (!array_key_exists($name, $fromFile))
                $out->deleted[] = (object) ['name' => $name];
        }
    }
}
