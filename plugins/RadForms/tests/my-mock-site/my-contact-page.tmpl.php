<!DOCTYPE html>
<html>
    <head><title>Contact</title></head>
    <body>
        <?= $this->RadForm(['name' => \RadPlugins\RadForms\Tests\Internal\Vars::TEST_FORM_NAME,
                            'template' => 'my-form',
                            'sendMailHandler' => 'MySendFormHandler']) ?>
    </body>
</html>