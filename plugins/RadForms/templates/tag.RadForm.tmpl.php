<?php
// @allow \Pike\PikeException
if (($form = $this->radFormsFetchForm((object) $props))): ?>
    <form action="<?= $this->url("/plugins/rad-forms/handle-submit/{$form->id}") ?>"
          method="post"
          id="rad-form-<?= $form->id ?>"
          novalidate>
        <?= $this->{$props['template']}(['formTagId' => "rad-form-{$form->id}"]) ?>
        <input type="hidden" name="_sendMailHandler" value="<?= is_string($props['sendMailHandler'] ?? null) ? $this->e($props['sendMailHandler']) : '' ?>">
        <input type="hidden" name="_returnTo" value="<?= is_string($props['returnTo'] ?? null) ? $this->e($props['returnTo']) : '' ?>">
    </form>
    <?php if (!$this->radFormsGetSetIsValidationLibLoaded()): ?>
        <script src="<?= $this->assetUrl('frontend/plugins/radforms/pristine.js') ?>"></script>
    <?php endif; ?>
    <script>(function (formEl) {
        var pristine = new window.Pristine(formEl);
        formEl.addEventListener('submit', function (e) {
            if (!pristine.validate())
                e.preventDefault();
        });
    }(document.getElementById('rad-form-<?= $form->id ?>')))</script>
<?php else: ?>
    <p>Lomaketta <?= $this->e($props['name']) ?> ei löytynyt.</p>
<?php endif; ?>