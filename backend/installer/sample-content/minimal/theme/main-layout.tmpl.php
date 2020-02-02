<?php
// Lokaalit tässä tiedostossa: {
//     $url: string,
//     $site: {$name: string, $lang: string},
// }.
// Lue lisää: https://todo/sivutemplaattien-käyttö.
$main = $this->fetchMultiField('Etusivusisältö', 'Pääsisältö', '#main');
$footer = $this->fetchMultiField('GlobalFooter', 'Footeri', 'footer'); ?>
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="utf-8">
    <title>Hello - <?= $site->name ?></title>
    <meta name="generator" content="RadCMS <?= RAD_VERSION ?>">
    <?= $this->cssFiles() ?>
</head>
<body>
    <header>
        <h1>Hello</h1>
    </header>
    <div id="main">
        <h2><?= $main->fields[0]->value ?></h2>
        <div><?= $main->fields[1]->value ?></div>
    </div>
    <footer>
        <div><?= $footer->fields[0]->value ?></div>
        <pre><?= $footer->fields[1]->value ?></pre>
        &copy; <?= $site->name ?> <?= date('Y') ?>
    </footer>
</body>
</html>