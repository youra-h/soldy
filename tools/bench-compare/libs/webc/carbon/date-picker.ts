import '@carbon/web-components/es/components/date-picker/index.js'
import { h } from '../dom'

/** A single date: the field with the calendar in a popup — `cds-date-picker` in `single` mode. */
export default () =>
	h('cds-date-picker', { 'date-format': 'd.m.Y' }, [
		h('cds-date-picker-input', {
			kind: 'single',
			'label-text': 'Дата',
			placeholder: 'дд.мм.гггг',
		}),
	])
