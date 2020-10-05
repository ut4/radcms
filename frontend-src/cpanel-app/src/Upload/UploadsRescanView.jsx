import {http, View, FormButtons, toasters, env, urlUtils} from '@rad-commons';

/**
 * #/rescan-uploads: näkymä, jolla admin voi synkronoida serverin kiintolevyn
 * sisällön tietokantaan.
 */
class UploadsRescanView extends preact.Component {
    /**
     * @access protected
     */
    render() {
        return <View>
            <h2>Skannaa kuvat</h2>
            <form onSubmit={ this.handleSubmit.bind(this) }>
                <p>Synkronoi lataukset-kansion tämänhetkinen sisältö tietokantaan?</p>
                <FormButtons submitButtonText="Synkronoi"/>
            </form>
        </View>;
    }
    /**
     * @access private
     */
    handleSubmit(e) {
        e.preventDefault();
        http.put('/api/uploads/rebuild-index', {areYouSure: 'yes, reduild everything'})
            .then(info => {
                if (info.ok === 'ok') {
                    toasters.main(`Synkronoitiin ${info.numChanges} tiedostoa`, 'success');
                    urlUtils.redirect('/manage-uploads');
                } else toasters.main((!info || !info.validationErrors)
                    ? 'Tiedostojen synkronointi epäonnistui'
                    : info.validationErrors.join(' | '), 'error');
            })
            .catch(env.console.error);
    }
}

export default UploadsRescanView;
