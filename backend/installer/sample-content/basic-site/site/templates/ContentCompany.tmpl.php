<article>
    <h2><?= $props['content']->Otsikko ?></h2>
    <?php if ($props['content']->Kuva): ?>
        <img src="<?= $this->assetUrl("/uploads/{$props['content']->Kuva}") ?>" alt="Yritys">
    <?php endif; ?>
    <div><?= $props['content']->Teksti ?></div>
</article>