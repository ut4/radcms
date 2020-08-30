<?php
// @allow \Pike\PikeException
if (($form = $this->radFormsFetchForm((object) $props))): ?>
    <form action="<?= $this->url("/plugins/rad-forms/handle-submit/{$form->id}") ?>"
          method="post"
          id="rad-form-<?= $form->id ?>"
          novalidate>
        <?= $this->{$props['template']}($form) ?>
        <input type="hidden" name="_sendMailHandler" value="<?= is_string($props['sendMailHandler'] ?? null) ? $this->e($props['sendMailHandler']) : '' ?>">
        <input type="hidden" name="_returnTo" value="<?= is_string($props['returnTo'] ?? null) ? $this->e($props['returnTo']) : '' ?>">
    </form>
<?php else: ?>
    <p>Lomaketta <?= $this->e($props['name']) ?> ei löytynyt.</p>
<?php endif; ?>