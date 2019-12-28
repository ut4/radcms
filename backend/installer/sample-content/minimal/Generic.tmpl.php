<?php
use RadCms\Templating\StockFrontendPanelImpls;
$node = $this->fetchOne('GenericBlobs')
                ->where('name = ?', $props['name'])
                ->createFrontendPanel(StockFrontendPanelImpls::Generic, $props['frontendPanelTitle'] ?? 'Sisältö')
                ->exec();
echo $node ? $node->content : 'No content found.'; ?>