import '@vaadin/menu-bar/vaadin-menu-bar.js'
import { h } from '../dom'

/**
 * The soldy menu preview in Vaadin: one root button of a menu bar whose
 * submenu holds the items. Checkable items are built in (`checked`); radio
 * items are checkable items the application keeps exclusive, group labels are
 * disabled items, shortcuts are a span in the item's component — as the
 * Vaadin docs suggest. Separators are `hr` components.
 */
type TItem = Record<string, unknown>

const separator = (): TItem => ({ component: 'hr' })
const label = (text: string): TItem => ({ text, disabled: true })
const shortcut = (text: string, keys: string): TItem => ({
	component: h('vaadin-menu-bar-item', {}, [
		text,
		h('span', { style: 'margin-inline-start:auto;padding-inline-start:16px;opacity:.6' }, [
			keys,
		]),
	]),
})

export default () => {
	const bar = h('vaadin-menu-bar')
	const radios: TItem[] = [
		{ text: 'По имени', checked: true, radio: true },
		{ text: 'По дате', checked: false, radio: true },
	]
	const root = {
		text: 'Действия',
		children: [
			label('Вид'),
			{ text: 'Сетка', checked: true, keepOpen: true, toggle: true },
			{ text: 'Линейка', checked: false, keepOpen: true, toggle: true },
			separator(),
			label('Сортировка'),
			...radios,
			separator(),
			shortcut('Изменить', 'Ctrl+E'),
			shortcut('Дублировать', 'Ctrl+D'),
			{
				text: 'Поделиться',
				children: [
					{ text: 'Ссылка' },
					{ text: 'Почта' },
					{ text: 'Мессенджеры', children: [{ text: 'Telegram' }, { text: 'WhatsApp' }] },
				],
			},
			{ text: 'В архив', disabled: true },
			separator(),
			{ text: 'Удалить', theme: 'error' },
		],
	}

	Reflect.set(bar, 'items', [root])
	bar.addEventListener('item-selected', (event) => {
		const item: unknown = Reflect.get(event, 'detail')?.value

		if (!item || typeof item !== 'object') return

		if (Reflect.get(item, 'toggle')) Reflect.set(item, 'checked', !Reflect.get(item, 'checked'))
		if (Reflect.get(item, 'radio')) for (const radio of radios) radio.checked = radio === item
	})

	return bar
}
