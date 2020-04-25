<?php
$footerContent = $this->fetchMultiField('globalFooter', // Sisällön nimi
                                        'Footeri',      // Hallintapaneeliosion otsikko
                                        'footer'        // Highlight CSS-selector
                                        ); ?>
<footer>
    <p>&copy; <?= $site->name ?> <?= date('Y') ?></p>
    <?php if ($footerContent): ?>
        <p><?= $footerContent->Teksti ?></p>
        <p><?= $footerContent->Tagline ?></p>
    <?php endif; ?>
</footer>