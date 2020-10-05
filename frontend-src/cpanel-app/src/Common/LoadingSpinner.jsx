/**
 * Aluksi näkymätön loaderi, joka tulee näkyviin 0.5sek jälkeen.
 */
class LoadingSpinner {
    /**
     * @access protected
     */
    render() {
        return <div class="show-after-05 dots-animation"></div>;
    }
}

export default LoadingSpinner;
