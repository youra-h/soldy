import '@carbon/web-components/es/components/button/index.js'
import '@carbon/web-components/es/components/tooltip/index.js'
import { h } from '../dom'

export default () =>
	h('cds-tooltip', {}, [
		h('cds-button', {}, ['Наведи']),
		h('cds-tooltip-content', {}, ['Короткое пояснение к кнопке']),
	])
