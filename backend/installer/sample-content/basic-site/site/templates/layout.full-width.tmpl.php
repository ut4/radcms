<?php
// Lue lisää: https://todo/sivutemplaattien-käyttö.
$id = strlen($url[0]) ? $url[0] : 'etusivu';
$mainContent = $this->fetchMultiField("sisältö-{$id}", // Sisällön nimi
                                      'Pääsisältö',    // Hallintapaneeliosion otsikko
                                      '#main'          // Highlight CSS-selector
                                      );
$title = $mainContent ? $mainContent->Otsikko : 'Sisältöä ei löytynyt'; ?>
<!DOCTYPE html>
<html lang="<?= $site->lang ?>">
<head>
    <meta charset="utf-8">
    <title><?= "{$title} - {$site->name}" ?></title>
    <meta name="generator" content="RadCMS <?= RAD_VERSION ?>">
    <?= $this->cssFiles() ?>
</head>
<body>
    <header>
        <h1><?= $title ?></h1>
        <?= $this->MainMenu() ?>
    </header>
    <div id="main">
        <?php if ($mainContent): ?>
            <?= $this->{'Content' . ([
                'yritys' => 'Company',
                'palvelut' => 'Services',
                // tähän lisää sivukohtaisia sisältötageja..
            ][$url[0]] ?? 'Default')}(['content' => $mainContent]) ?>
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