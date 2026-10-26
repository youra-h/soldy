import '@spectrum-web-components/button/sp-button.js'
import '@spectrum-web-components/dialog/sp-dialog-wrapper.js'
import '@spectrum-web-components/overlay/sp-overlay.js'
import '@spectrum-web-components/textfield/sp-textfield.js'
import { h } from '../dom'

/**
 * A modal dialog with a field: `sp-dialog-wrapper` (underlay, headline, the
 * two footer buttons) in a modal `sp-overlay` opened by its button, as the
 * docs show. The overlay closes it on Escape; the footer buttons close it too.
 */
export default () => {
	const opener = h('sp-button', {}, ['Открыть окно'])
	const overlay = h('sp-overlay', { type: 'modal' })
	const dialog = h(
		'sp-dialog-wrapper',
		{
			headline: 'Настройки',
			underlay: true,
			dismissable: true,
			'confirm-label': 'Сохранить',
			'cancel-label': 'Отмена',
		},
		[
			h('p', {}, ['Произвольное содержимое: текст, поля, кнопки']),
			h('sp-textfield', { placeholder: 'Имя', label: 'Имя' }),
		],
	)
	const close = () => Reflect.set(overlay, 'open', false)

	Reflect.set(overlay, 'triggerElement', opener)
	Reflect.set(overlay, 'triggerInteraction', 'click')
	dialog.addEventListener('confirm', close)
	dialog.addEventListener('cancel', close)
	overlay.append(dialog)

	return h('div', { style: 'display:contents' }, [opener, overlay])
}
