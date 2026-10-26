import '@soldy-ui/webc/button'
import '@soldy-ui/webc/dialog'
import '@soldy-ui/webc/input'
import { h, slotted, so } from '../dom'

function closing(text: string): HTMLElement {
	const node = so('button', 'so-button', { text })

	node.addEventListener('click', () => {
		const panel = node.closest('.so-dialog')

		if (panel) Reflect.set(panel, 'visible', false)
	})

	return node
}

export default () => {
	const dialog = so('div', 'so-dialog', {}, [
		slotted(h('span', {}, ['Настройки']), 'title'),
		h('p', {}, ['Произвольное содержимое: текст, поля, кнопки']),
		so('div', 'so-input', { placeholder: 'Имя' }),
		slotted(closing('Отмена'), 'footer'),
		slotted(closing('Сохранить'), 'footer'),
	])
	const opener = so('button', 'so-button', { text: 'Открыть окно' })

	opener.addEventListener('click', () => Reflect.set(dialog, 'visible', true))

	return h('div', { style: 'display:contents' }, [opener, dialog])
}
