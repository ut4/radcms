import {InputGroup} from '@rad-commons';
import BaseFieldWidget from './Base.jsx';
import DateTimePicker from '../../Common/DateTimePicker.jsx';

class DateTimePickerFieldWidget extends BaseFieldWidget {
    /**
     * @access protected
     */
    render() {
        return <InputGroup label={ this.label }>
            <DateTimePicker
                inputName={ this.props.field.name }
                defaultDate={ this.props.initialValue ? new Date(this.props.initialValue * 1000) : null }
                onSelect={ date => {
                    const unixTime = Math.floor(date.getTime() / 1000);
                    this.props.onValueChange(!this.props.field.datatype || this.props.field.datatype.endsWith('int')
                        ? unixTime
                        : unixTime.toString());
                } }
                showTime={ this.props.settings.showTime }/>
        </InputGroup>;
    }
}

export default DateTimePickerFieldWidget;
