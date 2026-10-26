import '@awesome.me/webawesome/dist/components/button/button.js'
import '@awesome.me/webawesome/dist/components/divider/divider.js'
import '@awesome.me/webawesome/dist/components/dropdown/dropdown.js'
import '@awesome.me/webawesome/dist/components/dropdown-item/dropdown-item.js'
import { h, slotted } from '../dom'

/**
 * The soldy menu preview in Web Awesome: `wa-dropdown` with checkbox items,
 * shortcuts in the `details` slot, nested submenus (`slot="submenu"`), a
 * disabled item and a `danger` one. There are no radio items: the radio group
 * is checkbox items kept exclusive on `wa-select`; group labels are `h6`
 * headings, as the Web Awesome docs show them.
 */
type TAttributes = Record<string, string | boolean>

const item = (text: string, attributes: TAttributes = {}, rest: Node[] = []) =>
	h('wa-dropdown-item', attributes, [text, ...rest])
const shortcut = (text: string) => slotted(h('span', {}, [text]), 'details')
const sub = (nodes: HTMLElement[]) => nodes.map((node) => slotted(node, 'submenu'))
const radio = (value: string, text: string, checked = false) =>
	item(text, { type: 'checkbox', value, 'data-radio': true, checked })

export default () => {
	const dropdown = h('wa-dropdown', {}, [
		slotted(h('wa-button', {}, ['Действия']), 'trigger'),
		h('h6', {}, ['Вид']),
		item('Сетка', { type: 'checkbox', value: 'grid', checked: true }),
		item('Линейка', { type: 'checkbox', value: 'ruler' }),
		h('wa-divider'),
		h('h6', {}, ['Сортировка']),
		radio('name', 'По имени', true),
		radio('date', 'По дате'),
		h('wa-divider'),
		item('Изменить', { value: 'edit' }, [shortcut('Ctrl+E')]),
		item('Дублировать', { value: 'copy' }, [shortcut('Ctrl+D')]),
		item(
			'Поделиться',
			{ value: 'share' },
			sub([
				item('Ссылка', { value: 'link' }),
				item('Почта', { value: 'mail' }),
				item(
					'Мессенджеры',
					{ value: 'messengers' },
					sub([
						item('Telegram', { value: 'telegram' }),
						item('WhatsApp', { value: 'whatsapp' }),
					]),
				),
			]),
		),
		item('В архив', { value: 'archive', disabled: true }),
		h('wa-divider'),
		item('Удалить', { value: 'remove', variant: 'danger' }, [shortcut('Del')]),
	])

	// Radio items: checking one unchecks the others of the group
	dropdown.addEventListener('wa-select', (event) => {
		const detail: unknown = Reflect.get(event, 'detail')
		const picked = detail instanceof Object ? Reflect.get(detail, 'item') : null

		if (!(picked instanceof HTMLElement) || !picked.hasAttribute('data-radio')) return

		for (const other of dropdown.querySelectorAll('[data-radio]')) {
			Reflect.set(other, 'checked', other === picked)
		}
	})

	return dropdown
}
