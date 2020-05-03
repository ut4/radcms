<?php
use RadCms\Templating\StockFrontendPanelImpls;
$articles = $this
    ->fetchAll('Articles')
    ->addFrontendPanel([
        'impl' => StockFrontendPanelImpls::DEFAULT_COLLECTION,
        'title' => $props['frontendPanelTitle'] ?? 'Artikkelit',
        'highlight' => '.articles'
    ])
    ->exec(); ?>
<div class="articles">
<?php if ($articles):
    foreach ($articles as $art): ?>
        <article>
            <h2><?= $art->title ?></h2>
            <div>
                <p><?= mb_substr($art->body, 0, 6) . '...' ?></p>
                <a href="<?= $this->url("/artikkeli/{$art->slug}") ?>">Lue lisää</a>
            </div>
        </article>
    <?php endforeach; ?>
<?php else: ?>
    <p>404.</p>
<?php endif; ?>
</div>