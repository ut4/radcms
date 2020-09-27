# RadForms-lisäosa

...

## Sisällysluettelo

1. [Tutoriaali - Mailin lähetys](#tutoriaali---mailin-lähetys)
1. [Php-tagit](#php-tagit)
1. [Devaus](#devaus)
1. [Lisenssi](#lisenssi)

## Tutoriaali - Mailin lähetys

### 1. Lisää tagikutsu haluasi sivun sivutemplaattiin

```php
<html>
...
<h1>Ota yhteyttä</h1>
<?= $this->RadForm(['name' => 'Yhteyslomake',
                    'template' => 'my-form-file-name',
                    // $urlStr on ladatun sivun urlipolku (esim. '/yhteys'),
                    // käytettävissä kaikissa templaateissa
                    'returnTo' => "{$urlStr}#/?form-sent"
                    ]) ?>
...
</html>
```

### 2. Luo lomake-templaatti

Luo edellisen stepin tagikutsun `template`-propertyyn määritelty tiedosto samaan kansioon sivutemplaatin kanssa käyttäen `.tmpl.php`-päätettä (esim. `site/templates/my-form-file-name.tmpl.php`), ja lisää sinne esim.

```php
<script>(function () { if (location.hash === '#/?form-sent') {
    var formEl = document.getElementById('<?= $props['formTagId'] ?>');
    var messageEl = document.createElement('div');
    messageEl.textContent = 'Kiitos viestistäsi!';
    formEl.parentElement.insertBefore(messageEl, formEl); // tai formEl.replaceWith(messageEl)
    history.replaceState(null, null, '');
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

#### Lomaketemplaattien oletusmuuttujat

- [siteName: string]: sivuston nimi
- [siteLang: string]: sivuston kielitagi

## Php-tagit

Tagit, jotka tämä lisäosa rekisteröi.

### RadForm(['name' => string, 'template' => string, '?returnTo' => string])

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
