<?php

namespace RadCms\Website;

use RadCms\ContentType\ContentTypeCollection;

class SiteConfigDiffer {
    /**
     * @param \RadCms\ContentType\ContentTypeCollection $fromFile
     * @param \RadCms\ContentType\ContentTypeCollection $fromDb
     * @return array [{added: array, deleted: array}, {added: array, deleted: array, dataTypeChanged: array}]
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
     * @param \RadCms\ContentType\FieldCollection $fromFile
     * @param \RadCms\ContentType\FieldCollection $froDb
     * @param object &$out ['added' => array, 'dataTypeChanged' => array]
     */
    private function diffFields($fromFile, $fromDb, &$out) {
        foreach ($fromFile->toArray() as $f) {
            $current = $fromDb->find($f->name) ?? null;
            if (!$current)
                $out->added[] = (object)['name' => $f->name,
                                         'friendlyName' => $f->friendlyName,
                                         'dataType' => $f->dataType,
                                         'widget' => $f->widget];
            elseif ($f->dataType !== $current->dataType)
                $out->dataTypeChanged[] = (object)['name' => $f->name,
                                                   'oldDataType' => $current->dataType,
                                                   'newDataType' => $f->dataType];
        }
        foreach ($fromDb->toArray() as $f) {
            if (!$fromFile->find($f->name))
                $out->deleted[] = (object) ['name' => $f->name];
        }
    }
}
