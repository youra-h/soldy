import '@carbon/web-components/es/components/menu/index.js'
import '@carbon/web-components/es/components/menu-button/index.js'
import { h } from '../dom'

/**
 * The soldy menu preview in Carbon: `cds-menu-button` with a group of
 * selectable items, a radio group, actions with shortcuts, a submenu with a
 * submenu inside (`cds-menu slot="submenu"`), a disabled action and a danger
 * one. Carbon has no popover item: the soldy «Срок» item has no pair here.
 */
const item = (
	label: string,
	attributes: Record<string, string | boolean> = {},
	children: Node[] = [],
) => h('cds-menu-item', { label, ...attributes }, children)
const submenu = (label: string, children: Node[]) =>
	item(label, {}, [h('cds-menu', { slot: 'submenu' }, children)])

export default () =>
	h('cds-menu-button', { label: 'Действия' }, [
		h('cds-menu', {}, [
			h('cds-menu-item-group', { label: 'Вид' }, [
				h('cds-menu-item-selectable', { label: 'Сетка', selected: true }),
				h('cds-menu-item-selectable', { label: 'Линейка' }),
			]),
			h('cds-menu-item-divider'),
			h('cds-menu-item-radio-group', { label: 'Сортировка' }, [
				item('По имени', { 'aria-checked': 'true' }),
				item('По дате', { 'aria-checked': 'false' }),
			]),
			h('cds-menu-item-divider'),
			item('Изменить', { shortcut: 'Ctrl+E' }),
			item('Дублировать', { shortcut: 'Ctrl+D' }),
			submenu('Поделиться', [
				item('Ссылка'),
				item('Почта'),
				submenu('Мессенджеры', [item('Telegram'), item('WhatsApp')]),
			]),
			item('В архив', { disabled: true }),
			h('cds-menu-item-divider'),
			item('Удалить', { kind: 'danger', shortcut: 'Del' }),
		]),
	])
