import '@soldy-ui/webc/button'
import '@soldy-ui/webc/tooltip'
import { slotted, so } from '../dom'

export default () =>
	so('span', 'so-tooltip', {}, [
		slotted(so('button', 'so-button', { text: 'Наведи' }), 'trigger'),
		'Короткое пояснение к кнопке',
	])
