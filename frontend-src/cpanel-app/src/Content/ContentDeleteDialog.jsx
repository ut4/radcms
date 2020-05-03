import {http, urlUtils, toasters, Confirmation} from '@rad-commons';
import {ContentNodeUtils} from '@rad-cpanel-commons';
import popupDialog from '../Common/PopupDialog.jsx';

class ContentDeleteDialog extends preact.Component {
    /**
     * @param {{contentNode: ContentNode;}} props
     */
    constructor(props) {
        super(props);
    }
    /**
     * @access protected
     */
    render() {
        return <div class="popup-dialog"><div class="box">
            <Confirmation onConfirm={ () => this.handleConfirm() }
                confirmButtonText="Poista sisältö"
                onCancel={ () => this.handleCancel() }>
            <h2>Poista sisältöä</h2>
            <div class="main">
                <p>Siirrä sisältö &quot;{ ContentNodeUtils.makeTitle(this.props.contentNode) }&quot; roskakoriin?</p>
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

/**
 * @access private
 */
function openDialog(contentNode, returnTo = '@current') {
    popupDialog.open(ContentDeleteDialog, {
        contentNode,
        onConfirm: () => {
            http.delete(`/api/content/${contentNode.id}/${contentNode.contentType}`)
                .then(() => {
                    if (returnTo === null)
                        urlUtils.reload();
                    else
                        urlUtils.redirect(returnTo, 'hard');
                })
                .catch(() => {
                    toasters.main('Sisällön poistaminen epäonnistui.', 'error');
                });
        }
    });
}

export default openDialog;
