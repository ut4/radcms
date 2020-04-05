<?php
// Lue lisää: https://todo/sivutemplaattien-käyttö.
$article = null;
$rendered = $this->Article(['slug' => $url[1], 'bindTo' => &$article]); ?>
<!DOCTYPE html>
<html lang="<?= $site->lang ?>">
<head>
    <meta charset="utf-8">
    <title><?= "{$article->title} - {$site->name}" ?></title>
    <meta name="generator" content="RadCMS <?= RAD_VERSION ?>">
    <?= $this->cssFiles() ?>
</head>
<body>
    <header>
        <h1>My site</h1>
    </header>
    <div id="main">
        <a href="<?= $this->url('/') ?>">&lt; Takaisin etusivulle</a>
        <?= $rendered ?>
    </div>
    <?= $this->Footer() ?>
</body>
</html>