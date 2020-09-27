import {dateUtils, InputGroup} from '@rad-commons';

let counter = 0;

class DateTimePicker extends preact.Component {
    /**
     * @param {{onSelect: (date: Date) => any; displayFormatFn?: (date: Date, format?: string) => string; defaultDate?: Date; minDate?: Date; maxDate?: Date; showTime?: boolean; autoClose?: boolean;}} props
     */
    constructor(props) {
        super(props);
        this.inputId = `date-picker-${++counter}`;
        this.inputEl = preact.createRef();
    }
    /**
     * @access protected
     */
    componentDidMount() {
        this.picker = this.picker || new window.Pikaday(this.makeSettings());
    }
    /**
     * @access protected
     */
    shouldComponentUpdate() {
        return false;
    }
    /**
     * @access protected
     */
    render() {
        return <InputGroup>
            <input
                name={ this.inputId }
                class="form-input"
                autoComplete="off"
                ref={ this.inputEl }/>
        </InputGroup>;
    }
    /**
     * @access protected
     */
    makeSettings() {
        const settings = {
            onSelect: date => this.props.onSelect(date),
            field: this.inputEl.current,
            showWeekNumber: true,
            showTime: this.props.showTime === true,
            autoClose: this.props.autoClose !== false,
            firstDay: 1,
            i18n: {
                previousMonth: 'Edellinen kuukausi',
                nextMonth: 'Seuraava kuukausi',
                months: ['Tammikuu','Helmikuu','Maaliskuu','Huhtikuu','Toukokuu','Kesäkuu','Heinäkuu','Elokuu','Syyskuu','Lokakuu','Marraskuu','Joulukuu'],
                weekdays: ['Sunnuntai','Maanantai','Tiistai','Keskiviikko','Torstai','Perjantai','Lauantai'],
                weekdaysShort: ['Su','Ma','Ti','Ke','To','Pe','La']
            },
            toString: this.props.displayFormatFn
                ? this.props.displayFormatFn
                : date => dateUtils.getLocaleDateString(date, this.props.showTime === true)
        };
        if (settings.showTime) {
            settings.use24hour = true;
            settings.timeLabel = 'Aika';
        }
        if (this.props.defaultDate) {
            settings.defaultDate = this.props.defaultDate;
            settings.setDefaultDate = true;
        }
        if (this.props.minDate) {
            settings.minDate = this.props.minDate;
        }
        if (this.props.maxDate) {
            settings.maxDate = this.props.maxDate;
        }
        return settings;
    }
}

export default DateTimePicker;
