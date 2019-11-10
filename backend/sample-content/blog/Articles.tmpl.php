<?php
use RadCms\Templating\StockFrontendPanelImpls;
$articles = $this->fetchAll('Articles')
                 ->createFrontendPanel(StockFrontendPanelImpls::List, $props['frontendPanelTitle'])
                 ->exec();
//
foreach ($articles as $art): ?>
    <article>
        <h2><?= $art->title ?></h2>
        <div>
            <p><?= mb_substr($art->body, 0, 6) . '... ' ?></p>
            <a href="<?= $this->url($art->slug) ?>">Read more</a>
        </div>
    </article>
<?php endforeach; ?>