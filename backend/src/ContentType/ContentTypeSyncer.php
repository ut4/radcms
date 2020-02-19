<?php

namespace RadCms\ContentType;

use Pike\Db;
use RadCms\Common\LoggerAccess;
use Pike\PikeException;

/**
 * .
 */
class ContentTypeSyncer {
    private $db;
    public function __construct(Db $db) {
        $this->db = $db;
    }
    /**
     * @param \stdClass {added: \RadCms\ContentType\ContentTypeCollection, deleted: \RadCms\ContentType\ContentTypeCollection}
     * @param \stdClass {added: array, deleted: array, dataTypeChanged: array}
     * @return bool
     * @throws \Pike\PikeException
     */
    public function sync($ctypesDiff, $fieldsDiff) {
        if (($ctypesDiff->deleted->length() + $ctypesDiff->added->length() +
             count($fieldsDiff->deleted) + count($fieldsDiff->added) +
             count($fieldsDiff->dataTypeChanged)) <= 0) {
            return null;
        }
        $this->db->beginTransaction();
        $migrator = new ContentTypeMigrator($this->db);
        try {
            if ($ctypesDiff->deleted->length()) {
                $migrator->uninstallMany($ctypesDiff->deleted);
                LoggerAccess::getLogger()->log('debug',
                    "Uninstalled {$ctypesDiff->deleted->length()} content types.");
            }
            //
            if ($ctypesDiff->added->length()) {
                $migrator->installMany($ctypesDiff->added);
                LoggerAccess::getLogger()->log('debug',
                    "Installed {$ctypesDiff->added->length()} content types.");
            }
            $this->db->commit();
            return true;
        } catch (PikeException $e) {
            $this->db->rollback();
            throw $e;
        }
    }
}
