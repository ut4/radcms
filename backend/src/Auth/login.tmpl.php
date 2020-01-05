<!DOCTYPE html>
<html lang="en">
<head>
    <title>RadCMS - Login</title>
    <meta http-equiv="Content-Type" content="text/html; charset=UTF-8">
    <meta name="robots" content="noindex,nofollow,noarchive,nosnippet">
    <link rel="stylesheet" href="<?= $this->assetUrl('frontend/common.css') ?>">
    <style>
        form { text-align: center; max-width: 300px; margin: 0 auto; }
        img { width: 100px; margin: 20px 0; }
        .box { padding: 30px; }
    </style>
</head>
<body class="light">
    <form onSubmit="handleFormSubmit(event)">
        <img src="<?= $this->assetUrl('frontend/assets/logo.png') ?>">
        <div class="hidden box no-highlight-stripe" id="main-err"></div>
        <div class="box no-highlight-stripe">
            <label>
                <span>Username</span>
                <input id="username">
                <span id="username-err"></span>
            </label>
            <label>
                <span>Password</span>
                <input type="password" id="password">
                <span id="password-err"></span>
            </label>
        </div>
        <div class="form-buttons">
            <button class="nice-button nice-button-primary" type="submit">Log in</button>
        </div>
    </form>
    <script>(function () {
        var usernameEl = document.getElementById('username');
        var passwordEl = document.getElementById('password');
        var usernameErrEl = document.getElementById('username-err');
        var passwordErrEl = document.getElementById('password-err');
        var mainErrEl = document.getElementById('main-err');
        window.handleFormSubmit = function (e) {
            e.preventDefault();
            if (clearErrorsAndValidate()) return;
            fetch('<?= $this->url('login') ?>', {
                method: 'POST',
                credentials: 'same-origin',
                headers: {'Content-Type': 'application/json'},
                body: JSON.stringify({username: usernameEl.value,
                                      password: passwordEl.value})
            })
            .then(function (res) {
                return res.json();
            })
            .then(function (info) {
                if (info.ok) window.location.href = '<?= $this->url('/edit') ?>';
                else if (info.err) showMainError(info.err);
                else throw new Error('wut?');
            })
            .catch(function (err) {
                showMainError('Unexpected error');
            });
        };
        function clearErrorsAndValidate() {
            hideMainError();
            usernameErrEl.textContent = usernameEl.value ? '' : 'Username is required';
            passwordErrEl.textContent = passwordEl.value ? '' : 'Password is required';
            return usernameErrEl.textContent || passwordErrEl.textContent;
        }
        function showMainError(message) {
            mainErrEl.textContent = message;
            mainErrEl.classList.remove('hidden');
        }
        function hideMainError() {
            mainErrEl.textContent = '';
            mainErrEl.classList.add('hidden');
        }
    }())</script>
</body>