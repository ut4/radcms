# RadForms-lisäosa

...

## Käyttö - mailin lähetys

### 1. Lisää tagikutsu haluasi sivun sivutemplaattiin

```php
<html>
...
<h1>Ota yhteyttä</h1>
<?= $this->RadForm(['name' => 'Yhteyslomake',
                    'template' => 'my-form-file-name',
                    // $urlStr on ladatun sivun urlipolku (esim. '/yhteys'),
                    // käytettävissä kaikissa tempaateissa
                    'returnTo' => "{$urlStr}#form-sent"
                    ]) ?>
...
</html>
```

### 2. Luo lomake-templaatti

Luo edellisen stepin tagikutsum `template`-propertyyn määritelty tiedosto samaan kansioon sivutemplaatin kanssa käyttäen `.tmpl.php`-päätettä  (esim. `site/templates/my-form-file-name.tmpl.php`), ja lisää sinne esim.

```php
<label>
    <span>Sähköposti</span>
    <input name="myFormEmail" type="email">
</label>
<label>
    <span>Viestisi</span>
    <textarea name="myFormMessage"></textarea>
</label>
```

Huomaa, että inputien name-attribuutit saa sisältää ainoastaan a-zA-Z0-9_ ks. [ut4.github.io/pike/validation.html#ruleidentifier](https://ut4.github.io/pike/validation.html#ruleidentifier).

### 3. Luo ja konfiguroi lomake hallintapaneelista

Lataa sivu jonka templaattiin lisäsit `RadForm()`-tagikutsun, ja luo lomake hallintapaneelin valikosta (Tällä sivulla > Lomake, Yhteyslomake) avautuvasta näkymästä. Lomakkeen Viesti-templaatin tageilla (esim. [myFormMessage]) voit viitata edellisen stepin lomakkeen inputeihin. Lisäosa sanitoi automaattisesti inputien arvot templaattia renderöidessään.

## Devaus

### Testien ajo

- `cd plugins/RadForms/`
- `"../../backend/vendor/bin/phpunit" --bootstrap ./tests/bootstrap.php ./tests`

## Lisenssi

apache-2.0
