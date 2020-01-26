import {urlUtils, View, InputGroup, Input} from '@rad-commons';

/**
 * #/pack-website
 */
class WebsitePackView extends preact.Component {
    /**
     * @access protected
     */
    render() {
        return <View><form action={ urlUtils.makeUrl('/api/packager') } method="POST">
            <h2>Paketoi sivusto</h2>
            <InputGroup label="Salausavain">
                <Input name="signingKey" value="my-encrypt-key" required/>
            </InputGroup>
            <div class="form-buttons">
                <button class="nice-button primary">Paketoi</button>
                <a href="#/">Peruuta</a>
            </div>
        </form></View>;
    }
}

export default WebsitePackView;
