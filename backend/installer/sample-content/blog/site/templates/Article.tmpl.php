<?php
use RadCms\Templating\StockFrontendPanelImpls;
$article = $this
    ->fetchOne('Articles')
    ->where('slug = ?', $props['slug'])
    ->addFrontendPanel(StockFrontendPanelImpls::Generic,
                       $props['frontendPanelTitle'] ?? 'Artikkeli',
                       'article',
                       $props['slug'])
    ->exec();
if (array_key_exists('bindTo', $props))
    $props['bindTo'] = $article ?? (object) ['title' => 404];
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