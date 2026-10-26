import '@awesome.me/webawesome/dist/components/button/button.js'
import '@awesome.me/webawesome/dist/components/dialog/dialog.js'
import '@awesome.me/webawesome/dist/components/input/input.js'
import { h, slotted } from '../dom'

/** A dialog with a field, opened by a button; the footer buttons close it. */
export default () => {
	const dialog = h('wa-dialog', { label: 'Настройки' }, [
		h('p', {}, ['Произвольное содержимое: текст, поля, кнопки']),
		h('wa-input', { placeholder: 'Имя' }),
	])
	const closing = (text: string) => {
		const node = slotted(h('wa-button', {}, [text]), 'footer')

		node.addEventListener('click', () => Reflect.set(dialog, 'open', false))

		return node
	}
	const opener = h('wa-button', {}, ['Открыть окно'])

	dialog.append(closing('Отмена'), closing('Сохранить'))
	opener.addEventListener('click', () => Reflect.set(dialog, 'open', true))

	return h('div', { style: 'display:contents' }, [opener, dialog])
}
