<?php
// Lokaalit tässä tiedostossa: {
//     $url: string,
//     $site: {$name: string, $lang: string},
// }.
// Lue lisää: https://todo/sivutemplaattien-käyttö.
$article = null;
$rendered = $this->Article(['slug' => $url[0], 'bindTo' => &$article]); ?>
<!DOCTYPE html>
<html lang="en">
<head>
    <title><?= "{$article->title} - {$site->name}" ?></title>
    <meta name="generator" content="RadCMS 0.0.0">
    <?= $this->cssFiles() ?>
</head>
<body>
    <header>
        <h1>My site</h1>
    </header>
    <div id="main">
        <a href="<?= $this->url('/') ?>">Back</a>
        <?= $rendered ?>
    </div>
    <footer>
        &copy; MySite <?= date('Y') ?>
    </footer>
</body>
</html>