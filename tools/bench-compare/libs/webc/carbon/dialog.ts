import '@carbon/web-components/es/components/button/index.js'
import '@carbon/web-components/es/components/modal/index.js'
import '@carbon/web-components/es/components/text-input/index.js'
import { fragment, h } from '../dom'

/** `cds-modal` opened by a button; its footer buttons close it, as in the soldy preview. */
export default () => {
	const close = () => modal.removeAttribute('open')
	const closing = (text: string, kind: string) => {
		const node = h('cds-button', { kind }, [text])

		node.addEventListener('click', close)

		return node
	}
	const modal = h('cds-modal', {}, [
		h('cds-modal-header', {}, [
			h('cds-modal-close-button'),
			h('cds-modal-heading', {}, ['Настройки']),
		]),
		h('cds-modal-body', {}, [
			h('p', {}, ['Произвольное содержимое: текст, поля, кнопки']),
			h('cds-text-input', { placeholder: 'Имя' }),
		]),
		h('cds-modal-footer', {}, [
			closing('Отмена', 'secondary'),
			closing('Сохранить', 'primary'),
		]),
	])
	const opener = h('cds-button', {}, ['Открыть окно'])

	opener.addEventListener('click', () => modal.setAttribute('open', ''))

	return fragment(opener, modal)
}
