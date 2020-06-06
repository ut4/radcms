<!DOCTYPE html>
<html lang="en">
<head>
    <title>RadCMS - <?= $title ?></title>
    <meta http-equiv="Content-Type" content="text/html; charset=UTF-8">
    <meta name="robots" content="noindex,nofollow,noarchive,nosnippet">
    <link rel="stylesheet" href="<?= $this->assetUrl('frontend/common.css') ?>">
    <style>
        form { text-align: center; max-width: 200px; margin: 0 auto; }
        img { width: 100px; margin: 20px 0; }
        .container { margin-bottom: 24px }
    </style>
</head>
<body class="light">
    <div id="<?= $reactAppName ?>"></div>
    <script src="<?= $this->assetUrl('frontend/vendor/vendor.bundle.min.js') ?>"></script>
    <script src="<?= $this->assetUrl('frontend/rad-commons.js') ?>"></script>
    <script src="<?= $this->assetUrl('frontend/rad-auth-apps.js') ?>"></script>
    <script>
        radCommons.urlUtils.baseUrl = '<?= $this->url('/') ?>';
        radCommons.urlUtils.assetBaseUrl = '<?= $this->assetUrl('/') ?>';
        preact.render(preact.createElement(radAuthApps.<?= $reactAppName ?>),
                      document.getElementById('<?= $reactAppName ?>'));
    </script>
</body>