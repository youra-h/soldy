import '@spectrum-web-components/action-menu/sp-action-menu.js'
import '@spectrum-web-components/menu/sp-menu.js'
import '@spectrum-web-components/menu/sp-menu-group.js'
import '@spectrum-web-components/menu/sp-menu-item.js'
import '@spectrum-web-components/menu/sp-menu-divider.js'
import { h } from '../dom'

/**
 * The soldy menu in Spectrum: a group of checkboxes (`selects="multiple"`), a
 * group of radios (`selects="single"`), shortcuts in the `value` slot, a
 * submenu with a submenu inside (`slot="submenu"`), a disabled item. Spectrum
 * has no destructive menu item: «Удалить» is a plain one.
 */
const item = (
	text: string,
	attributes: Record<string, string | boolean> = {},
	children: Node[] = [],
) => h('sp-menu-item', attributes, [text, ...children])
const shortcut = (text: string) => h('span', { slot: 'value' }, [text])
const submenu = (...children: Node[]) => h('sp-menu', { slot: 'submenu' }, children)
const header = (text: string) => h('span', { slot: 'header' }, [text])

export default () =>
	h('sp-action-menu', {}, [
		h('span', { slot: 'label' }, ['Действия']),
		h('sp-menu-group', { selects: 'multiple' }, [
			header('Вид'),
			item('Сетка', { value: 'grid', selected: true }),
			item('Линейка', { value: 'ruler' }),
		]),
		h('sp-menu-divider'),
		h('sp-menu-group', { selects: 'single' }, [
			header('Сортировка'),
			item('По имени', { value: 'name', selected: true }),
			item('По дате', { value: 'date' }),
		]),
		h('sp-menu-divider'),
		item('Изменить', { value: 'edit' }, [shortcut('Ctrl+E')]),
		item('Дублировать', { value: 'copy' }, [shortcut('Ctrl+D')]),
		item('Поделиться', { value: 'share' }, [
			submenu(
				item('Ссылка', { value: 'link' }),
				item('Почта', { value: 'mail' }),
				item('Мессенджеры', { value: 'messengers' }, [
					submenu(
						item('Telegram', { value: 'telegram' }),
						item('WhatsApp', { value: 'whatsapp' }),
					),
				]),
			),
		]),
		item('В архив', { value: 'archive', disabled: true }),
		h('sp-menu-divider'),
		item('Удалить', { value: 'remove' }, [shortcut('Del')]),
	])
