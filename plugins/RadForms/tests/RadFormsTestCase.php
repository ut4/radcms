<?php declare(strict_types=1);

namespace RadPlugins\RadForms\Tests;

use RadCms\PluginTestUtils\PluginTestCase;
use RadPlugins\RadForms\Tests\Internal\Vars;

abstract class RadFormsTestCase extends PluginTestCase {
    protected function insertTestFormToDb(object $state): void {
        self::$db->exec('INSERT INTO `${p}RadForms` (`name`,`behaviours`) VALUES (?,?)',
                        [Vars::TEST_FORM_NAME, json_encode($state->testFormBehaviours ?? [])]);
        $state->testFormInsertId = self::$db->lastInsertId();
    }
}
