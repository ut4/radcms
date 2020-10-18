/**
 * #/: Asentajan päänäkymä.
 */
class IndexView extends preact.Component {
    /**
     * @access protected
     */
    render() {
        return <div>
            <h2>Asenna RadCMS</h2>
            <div class="container columns">
                <a href="#/from-package" class="btn col-sm-12 btn-huge btn-primary mr-2 mb-2">
                    Asenna paketista
                </a>
                <a href="#/with-wizard" class="btn col-sm-12 btn-primary btn-huge">
                    Asenna asennusvelholla
                </a>
            </div>
        </div>;
    }
}

export default IndexView;
