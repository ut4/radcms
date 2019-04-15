window.$el = preact.createElement;
window.myRedirect = (to, full) => {
    if (!full) {
        window.parent.location.hash = '#' + to;
    } else {
        window.parent.location.href = window.parent.location.origin + to;
    }
};
