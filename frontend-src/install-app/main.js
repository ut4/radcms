import InstallApp from './src/InstallApp.jsx';

preact.render(preact.createElement(InstallApp, {packageExists: window.packageExists}),
              document.getElementById('install-app'));
