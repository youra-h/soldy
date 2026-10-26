import '@vaadin/button/vaadin-button.js'
import '@vaadin/dialog/vaadin-dialog.js'
import '@vaadin/text-field/vaadin-text-field.js'
import { h } from '../dom'

/** Header, body with a field and a footer of two closing buttons — through the dialog's renderers. */
export default () => {
	const dialog = h('vaadin-dialog', {}, [], { headerTitle: 'Настройки' })
	const close = () => Reflect.set(dialog, 'opened', false)
	const closing = (text: string) => {
		const node = h('vaadin-button', {}, [text])

		node.addEventListener('click', close)

		return node
	}

	Reflect.set(dialog, 'renderer', (root: HTMLElement) => {
		if (root.firstChild) return

		root.append(
			h('p', {}, ['Произвольное содержимое: текст, поля, кнопки']),
			h('vaadin-text-field', { placeholder: 'Имя' }),
		)
	})
	Reflect.set(dialog, 'footerRenderer', (root: HTMLElement) => {
		if (root.firstChild) return

		root.append(closing('Отмена'), closing('Сохранить'))
	})

	const opener = h('vaadin-button', {}, ['Открыть окно'])

	opener.addEventListener('click', () => Reflect.set(dialog, 'opened', true))

	return h('div', { style: 'display:contents' }, [opener, dialog])
}
