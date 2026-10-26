import '@ui5/webcomponents/dist/Switch.js'
import '@ui5/webcomponents/dist/Label.js'
import { h } from '../dom'

/** The switch has no text of its own: the label is `ui5-label` next to it, `for` by id. */
let ids = 0

export default () => {
	const id = `ui5-switch-${++ids}`

	return h('span', {}, [h('ui5-switch', { id }), h('ui5-label', { for: id }, ['Включено'])])
}
