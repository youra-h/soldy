import '@awesome.me/webawesome/dist/components/button/button.js'
import '@awesome.me/webawesome/dist/components/tooltip/tooltip.js'
import { h } from '../dom'

/** The tooltip refers to its trigger by id (`for`): every copy has its own. */
let copies = 0

export default () => {
	const id = `wa-tooltip-${++copies}`

	return h('span', {}, [
		h('wa-button', { id }, ['Наведи']),
		h('wa-tooltip', { for: id }, ['Короткое пояснение к кнопке']),
	])
}
