/**
 * @param {string} message
 * @returns {string}
 */
function translateError(message) {
    return {
        'User not found': 'Käyttäjää ei löytynyt',
        'Invalid password': 'Salasana ei täsmännyt',
        'Invalid reset key or email': 'Email tai palautusavain ei kelpaa',
    }[message] || 'Jokin meni pieleen';
}

export {translateError};
