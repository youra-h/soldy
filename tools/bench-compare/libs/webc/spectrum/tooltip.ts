import '@spectrum-web-components/button/sp-button.js'
import '@spectrum-web-components/tooltip/sp-tooltip.js'
import { h } from '../dom'

/** A self-managed tooltip inside its trigger: hover with a delay, focus at once. */
export default () =>
	h('sp-button', { variant: 'secondary' }, [
		'Наведи',
		h('sp-tooltip', { 'self-managed': true }, ['Короткое пояснение к кнопке']),
	])
