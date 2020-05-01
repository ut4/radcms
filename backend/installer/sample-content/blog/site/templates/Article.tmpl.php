<?php
use RadCms\Templating\StockFrontendPanelImpls;
$article = $this
    ->fetchOne('Articles')
    ->where('slug = ?', $props['slug'])
    ->addFrontendPanel([
        'impl' => StockFrontendPanelImpls::DEFAULT_SINGLE,
        'title' => $props['frontendPanelTitle'] ?? 'Artikkeli',
        'subtitle' => $props['slug'],
        'highligh' => 'article'
    ])
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