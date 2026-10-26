import '@ui5/webcomponents/dist/Button.js'
import '@ui5/webcomponents/dist/Menu.js'
import '@ui5/webcomponents/dist/MenuItem.js'
import '@ui5/webcomponents/dist/MenuItemGroup.js'
import '@ui5/webcomponents/dist/MenuSeparator.js'
import { h } from '../dom'

/**
 * The soldy menu preview in UI5: checkbox and radio groups are
 * `ui5-menu-item-group` with `check-mode` Multiple and Single (groups have no
 * caption), shortcuts — `additional-text`, submenus — nested items. The menu
 * is opened by a button through `opener`.
 */
const item = (
	text: string,
	attributes: Record<string, string | boolean> = {},
	children: Node[] = [],
) => h('ui5-menu-item', { text, ...attributes }, children)

export default () => {
	const trigger = h('ui5-button', {}, ['Действия'])
	const menu = h('ui5-menu', {}, [
		h('ui5-menu-item-group', { 'check-mode': 'Multiple' }, [
			item('Сетка', { checked: true }),
			item('Линейка'),
		]),
		h('ui5-menu-separator'),
		h('ui5-menu-item-group', { 'check-mode': 'Single' }, [
			item('По имени', { checked: true }),
			item('По дате'),
		]),
		h('ui5-menu-separator'),
		item('Изменить', { 'additional-text': 'Ctrl+E' }),
		item('Дублировать', { 'additional-text': 'Ctrl+D' }),
		item('Поделиться', {}, [
			item('Ссылка'),
			item('Почта'),
			item('Мессенджеры', {}, [item('Telegram'), item('WhatsApp')]),
		]),
		item('В архив', { disabled: true }),
		h('ui5-menu-separator'),
		item('Удалить', { 'additional-text': 'Del' }),
	])

	Reflect.set(menu, 'opener', trigger)
	trigger.addEventListener('click', () => Reflect.set(menu, 'open', true))

	return h('span', {}, [trigger, menu])
}
