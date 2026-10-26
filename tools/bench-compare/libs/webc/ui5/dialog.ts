import '@ui5/webcomponents/dist/Button.js'
import '@ui5/webcomponents/dist/Dialog.js'
import '@ui5/webcomponents/dist/Input.js'
import { h } from '../dom'

/** The opener and the dialog side by side; footer buttons close it. */
export default () => {
	const close = (text: string) => {
		const node = h('ui5-button', {}, [text])

		node.addEventListener('click', () => Reflect.set(dialog, 'open', false))

		return node
	}
	const dialog = h('ui5-dialog', { 'header-text': 'Настройки' }, [
		h('p', {}, ['Произвольное содержимое: текст, поля, кнопки']),
		h('ui5-input', { placeholder: 'Имя' }),
		h('div', { slot: 'footer' }, [close('Отмена'), close('Сохранить')]),
	])
	const opener = h('ui5-button', {}, ['Открыть окно'])

	opener.addEventListener('click', () => Reflect.set(dialog, 'open', true))

	return h('div', { style: 'display:contents' }, [opener, dialog])
}
