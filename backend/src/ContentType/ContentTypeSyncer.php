<?php

namespace RadCms\ContentType;

use RadCms\Framework\Db;
use RadCms\Common\LoggerAccess;

/**
 * .
 */
class ContentTypeSyncer {
    private $db;
    public function __construct(Db $db) {
        $this->db = $db;
    }
    /**
     * @param object ['added' => \RadCms\ContentType\ContentTypeCollection, 'deleted' => \RadCms\ContentType\ContentTypeCollection]
     * @param object ['added' => [], 'deleted' => [], 'dataTypeChanged' => []]
     * @return null|string null on success or 'Some error message'
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
                    'Uninstalled ' . $ctypesDiff->deleted->length() . ' content types.');
            }
            //
            if ($ctypesDiff->added->length()) {
                $migrator->installMany($ctypesDiff->added);
                LoggerAccess::getLogger()->log('debug',
                    'Installed ' . $ctypesDiff->added->length() . ' content types.');
            }
            $this->db->commit();
            return null;
        } catch (\PDOException $e) {
            $this->db->rollback();
            return 'Failed to sync content types.';
        } catch (\RuntimeException $e) {
            $this->db->rollback();
            return $e->getMessage();
        }
    }
}
