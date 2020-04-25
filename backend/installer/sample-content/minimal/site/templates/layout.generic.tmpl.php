<?php
// Lue lisää: https://todo/sivutemplaattien-käyttö.
$mainContent = $this->fetchMultiField('etusivusisältö', // Sisällön nimi
                                      'Pääsisältö',     // Hallintapaneeliosion otsikko
                                      '#main'           // Highlight CSS-selector
                                      ); ?>
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
        <?php if ($mainContent): ?>
            <h2><?= $mainContent->Otsikko ?></h2>
            <div><?= $mainContent->Teksti ?></div>
        <?php else: ?>
            <h2>404</h2>
            <div>404</div>
        <?php endif; ?>
    </div>
    <footer>
        &copy; <?= $site->name ?> <?= date('Y') ?>
    </footer>
</body>
</html>