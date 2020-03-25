<?php
// Lue lisää: https://todo/sivutemplaattien-käyttö.
$mainContent = $this->fetchMultiField('etusivusisältö', 'Pääsisältö', '#main');
$footerContent = $this->fetchMultiField('globalFooter', 'Footeri', 'footer'); ?>
<!DOCTYPE html>
<html lang="<?= $site->lang ?>">
<head>
    <meta charset="utf-8">
    <title><?= $site->name ?></title>
    <meta name="generator" content="RadCMS <?= RAD_VERSION ?>">
    <?= $this->cssFiles() ?>
</head>
<body>
    <header>
        <h1>Otsikko</h1>
    </header>
    <div id="main">
        <h2><?= $mainContent->Otsikko ?></h2>
        <div><?= $mainContent->Teksti ?></div>
    </div>
    <footer>
        <div><?= $footerContent->Teksti ?></div>
        <pre><?= $footerContent->Tagline ?></pre>
        &copy; <?= $site->name ?> <?= date('Y') ?>
    </footer>
</body>
</html>