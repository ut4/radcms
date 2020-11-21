# RadForms-lisäosa

...

## Sisällysluettelo

1. [Tutoriaali](#tutoriaali)
1. [Php-tagit](#php-tagit)
1. [Devaus](#devaus)
1. [Lisenssi](#lisenssi)

## Tutoriaali

### 1. Lisää tagikutsu haluamasi sivun sivutemplaattiin

```php
<html>
...
<h1>Ota yhteyttä</h1>
<?= $this->RadForm(['name' => 'Yhteyslomake',
                    'template' => 'my-form-file-name',
                    // $urlStr on ladatun sivun urlipolku (esim. '/yhteys'),
                    // käytettävissä kaikissa templaateissa
                    'returnTo' => "{$urlStr}#my-form-sent"
                    ]) ?>
...
</html>
```

### 2. Luo lomake-templaatti

Luo edellisen stepin tagikutsun `template`-propertyyn määritelty tiedosto samaan kansioon sivutemplaatin kanssa käyttäen `.tmpl.php`-päätettä (esim. `site/templates/my-form-file-name.tmpl.php`), ja lisää sinne esim.

```php
<script>(function () { if (location.hash === '#my-form-sent') {
    var formEl = document.getElementById('<?= $props['formTagId'] ?>');
    var messageEl = document.createElement('div');
    messageEl.textContent = 'Kiitos viestistäsi!';
    formEl.parentElement.insertBefore(messageEl, formEl); // tai formEl.replaceWith(messageEl)
    formEl.scrollIntoView(true);
    history.replaceState(null, null, location.href.replace('#my-form-sent', ''));
} }())</script>
<div class="form-group">
    <label>Sähköposti</label>
    <input name="myFormEmail" type="email">
</div>
<div class="form-group">
    <label>Viesti</label>
    <textarea name="myFormMessage" required></textarea>
</div>
<button>Lähetä</button>
```

Huomaa, että inputien name-attribuutit saa sisältää ainoastaan a-zA-Z0-9_ ks. [ut4.github.io/pike/validation.html#ruleidentifier](https://ut4.github.io/pike/in-depth/validation.html#ruleidentifier). Inputit validoidaan automaattisesti frontendissä, ks. [github.com/sha256/Pristine](https://github.com/sha256/Pristine#built-in-validators).

### 3. Luo ja konfiguroi lomake hallintapaneelista

Lataa sivu selaimessa jonka templaattiin lisäsit `RadForm()`-tagikutsun, ja luo lomake hallintapaneelin valikosta (Tällä sivulla > Lomake, Yhteyslomake) avautuvasta näkymästä. Anna lomakkeen nimeksi stepin 1. tagikutsussa määritelty nimi (esim. `Yhteyslomake`). Lomakkeen viesti-, ja aihe-templaateissa voit viitata tageilla (esim. [myFormMessage]) edellisen stepin lomakedataan sekä oletusmuuttujiin (ks. [Lomaketemplaattien oletusmuuttujat](#lomaketemplaattien-oletusmuuttujat)). Lisäosa sanitoi automaattisesti inputien arvot (esim. lomakkeesta lähetetty `<img onerror="xss()"/>` renderöityy emailiin lähetettävään templaattiin muodossa `&lt;img onerror=&quot;xss()&quot;&gt;`).

### 4. (vapaaehtoinen) Lisää mailerin konfiguroija

Jos haluat käyttää mailin lähetykseen jotain muuta kuin oletus [mail()](https://www.php.net/manual/en/function.mail.php)-funktiota, voit tehdä sen lisäämällä `RadForms::ON_MAILER_CONFIGURE`-signaalille kuuntelijan, jota RadForms kutsuu aina juuri ennen mailin lähettämistä. Lisää kuuntelija Theme tai Site.php:hen:

```php
<?php declare(strict_types=1);

namespace RadSite;

use RadPlugins\RadForms\RadForms;
use PhpMailer\PhpMailer\PhpMailer;

class Site implements WebsiteInterface {
    public function init(WebsiteAPI $api): void {
        $api->on(RadForms::ON_MAILER_CONFIGURE, function (PhpMailer $mailer,
                                                          string $formId) {
            $mailer->isSMTP();
            $mailer->Host = 'smtp.foo.com';
            // ... jne.
        });
    }
}

```

#### Lomaketemplaattien oletusmuuttujat

- [siteName: string]: sivuston nimi
- [siteLang: string]: sivuston kielitagi

## Php-tagit

Tagit, jotka tämä lisäosa rekisteröi.

### RadForm(['name' => string, 'template' => string, 'returnTo' => string])

- name: Tietokannasta haettavan lomakkeen nimi
- template: Lomaketemplaattitiedoston nimi. Templaattiin passautuvat propsit: `['formId' => 'lomake-elementin-id']`
- returnTo: relatiivinen urli, johon käyttäjä ohjataan lomakkeen lähetyksen päätteeksi

## Devaus

### Testien ajo

- `cd plugins/RadForms/`
- `"../../backend/vendor/bin/phpunit" --bootstrap ./tests/bootstrap.php ./tests`

### Frontendin buildaus

- `cd plugins/RadForms/`
- `npm --prefix ../../ start -- --configInput plugins/RadForms/rollup.config.js`

## Lisenssi

apache-2.0
