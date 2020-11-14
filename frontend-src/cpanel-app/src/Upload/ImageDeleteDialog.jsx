import {Confirmation} from '@rad-commons';
import popupDialog from '../Common/PopupDialog.jsx';

class ImageDeleteDialog extends preact.Component {
    /**
     * @param {{fileName: string; onConfirm: () => any;}} props
     */
    static open(props) {
        popupDialog.open(ImageDeleteDialog, props);
    }
    /**
     * @access protected
     */
    render({fileName}) {
        return <div class="popup-dialog"><div class="box">
            <Confirmation onConfirm={ () => this.handleConfirm() }
                confirmButtonText="Poista tiedosto"
                onCancel={ () => this.handleCancel() }>
            <h2>Poista tiedosto</h2>
            <div class="main">
                <p>Poista tiedosto &quot;{fileName}&quot; pysyvästi?</p>
            </div>
        </Confirmation></div></div>;
    }
    /**
     * @access private
     */
    handleConfirm() {
        this.props.onConfirm();
        this.handleCancel();
    }
    /**
     * @access private
     */
    handleCancel() {
        popupDialog.close();
    }
}

export default ImageDeleteDialog;
