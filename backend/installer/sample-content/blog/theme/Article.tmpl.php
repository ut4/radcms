<?php
use RadCms\Templating\StockFrontendPanelImpls;
$article = $this
    ->fetchOne('Articles')
    ->where('slug = ?', $props['slug'] ?? '')
    ->createFrontendPanel(StockFrontendPanelImpls::Generic, $props['frontendPanelTitle'] ?? 'Artikkeli')
    ->exec();
if (array_key_exists('bindTo', $props))
    $props['bindTo'] = $article;
if ($article): ?>
    <article>
        <h2><?= $article->title ?></h2>
        <div><?= $article->body ?></div>
    </article>
<?php else: ?>
    <article>
        <h2>404</h2>
        <div>404</div>
    </article>
<?php endif; ?>