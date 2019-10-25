<?php
use RadCms\Templating\FrontendPanelType;
$article = $this->fetchOne('Articles')
                ->where("slug='{$props['slug']}'")
                ->createFrontendPanel(FrontendPanelType::Generic, 'Article')
                ->exec();
if (array_key_exists('bindTo', $props))
    $props['bindTo'] = $article; ?>
<article>
    <h2><?= $article->title ?></h2>
    <div><?= $article->body ?></div>
</article>