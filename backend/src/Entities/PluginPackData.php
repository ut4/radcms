<?php

declare(strict_types=1);

namespace RadCms\Entities;

/**
 * Varastoi datan jonka lisäosa voi asettaa sisällytettäväksi Packager->pack() -
 * pakettiin. Varastoitu data passataan myös lisäosan install() -metodille.
 */
final class PluginPackData {
    /** @var array[mixed[]] [['ContentTypeName', [(object)['key' => 'value']...]]...] */
    public $initialContent = [];
}
