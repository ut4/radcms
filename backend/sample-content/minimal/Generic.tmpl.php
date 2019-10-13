<?php
use RadCms\Templating\FrontendPanelType;
$node = $this->fetchOne('GenericBlobs')
                ->where("name='{$props['name']}'")
                ->createFrontendPanel(FrontendPanelType::Generic, $props['frontendPanelTitle'])
                ->exec();
echo $node ? $node->content : 'No content found.'; ?>