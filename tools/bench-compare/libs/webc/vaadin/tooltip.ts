import '@vaadin/button/vaadin-button.js'
import '@vaadin/tooltip/vaadin-tooltip.js'
import { h } from '../dom'

/** The tooltip is a slotted child of the button, as the Vaadin docs attach it. */
export default () =>
	h('vaadin-button', {}, [
		'Наведи',
		h('vaadin-tooltip', { slot: 'tooltip', text: 'Короткое пояснение к кнопке' }),
	])
