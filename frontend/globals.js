window.$el = preact.createElement;
window.myRedirect = (to, full) => {
    if (!full) {
        window.parent.location.hash = '#' + to;
    } else {
        window.parent.location.href = window.parent.location.origin + to;
    }
};
window.toast = (message, level) => {
    if (level === 'error') console.error(message);
    else console.info(message);
};