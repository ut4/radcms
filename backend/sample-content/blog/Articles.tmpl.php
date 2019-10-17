<?php
use RadCms\Templating\FrontendPanelType;
$articles = $this->fetchAll('Articles')
                 ->createFrontendPanel(FrontendPanelType::List, $props['frontendPanelTitle'])
                 ->exec();
//
foreach ($articles as $art): ?>
    <article>
        <h2><?= $art->title ?></h2>
        <div>
            <p><?= substr($art->body, 0, 6) . '... ' ?></p>
            <a href="<?= $this->url($art->slug) ?>">Read more</a>
        </div>
    </article>
<?php endforeach; ?>