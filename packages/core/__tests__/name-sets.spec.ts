/**
 * Имён кнопок ядро не строит.
 *
 * Имена кнопок без текста — закрыть, развернуть, листать, очистить — строки
 * языка, а язык знает место компонента в дереве, а не экземпляр: локаль
 * приходит от провайдера адаптера в контекст плагина, и имена пишут плагины
 * имён. Ядро держит живые наборы этих кнопок и пишет в них только то, что
 * знает само (`tabindex`, `aria-pressed`). Набор живой: запись в него — его
 * событие `change:<набор>`, на нём стоит триггер выхода.
 */

import { describe, it, expect, vi } from 'vitest'
import {
	TCalendar,
	TDateInput,
	TDatePicker,
	TDialog,
	TDrawer,
	TInput,
	TPopover,
	TScroller,
	TTabsItem,
	TTagsItem,
} from '../src'
import type { TAria } from '../src'

/** Набор кнопки и событие, которым он сообщает о записи. */
type TNameSet = {
	readonly set: TAria
	readonly events: { on(event: string, handler: (value: unknown) => void): void }
	readonly event: string
}

/** Наборы кнопок по компонентам — те, куда плагины имён пишут `aria-label`. */
function nameSets(): Record<string, TNameSet[]> {
	const dialog = new TDialog()
	const drawer = new TDrawer()
	const popover = new TPopover()
	const tab = new TTabsItem({ text: 'Почта', closable: true })
	const tag = new TTagsItem({ text: 'Почта', closable: true })
	const scroller = new TScroller()
	const input = new TInput({ name: 'Город' })
	const dateInput = new TDateInput({ name: 'Дата' })
	const calendar = new TCalendar()
	const picker = new TDatePicker()

	return {
		Dialog: [
			{ set: dialog.closeAria, events: dialog.events, event: 'change:closeAria' },
			{ set: dialog.maximizeAria, events: dialog.events, event: 'change:maximizeAria' },
		],
		Drawer: [{ set: drawer.closeAria, events: drawer.events, event: 'change:closeAria' }],
		Popover: [{ set: popover.closeAria, events: popover.events, event: 'change:closeAria' }],
		'Tabs.Item': [{ set: tab.closeAria, events: tab.events, event: 'change:closeAria' }],
		'Tags.Item': [{ set: tag.closeAria, events: tag.events, event: 'change:closeAria' }],
		Scroller: [
			{ set: scroller.prevAria, events: scroller.events, event: 'change:prevAria' },
			{ set: scroller.nextAria, events: scroller.events, event: 'change:nextAria' },
		],
		Input: [{ set: input.clearAria, events: input.events, event: 'change:clearAria' }],
		DateInput: [
			{ set: dateInput.clearAria, events: dateInput.events, event: 'change:clearAria' },
		],
		Calendar: [
			{ set: calendar.prevAria, events: calendar.events, event: 'change:prevAria' },
			{ set: calendar.nextAria, events: calendar.events, event: 'change:nextAria' },
		],
		DatePicker: [
			{ set: picker.triggerAria, events: picker.events, event: 'change:triggerAria' },
			{ set: picker.panelAria, events: picker.events, event: 'change:panelAria' },
		],
	}
}

describe('ядро имён кнопок не строит', () => {
	it.each(Object.entries(nameSets()))('%s: имени в наборах нет', (_name, sets) => {
		for (const { set } of sets) expect(set.has('aria-label')).toBe(false)
	})

	it.each(Object.entries(nameSets()))(
		'%s: запись имени — событие набора со снимком',
		(_name, sets) => {
			for (const { set, events, event } of sets) {
				const handler = vi.fn()

				events.on(event, handler)
				set.add('aria-label', 'Имя')

				expect(handler).toHaveBeenCalledExactlyOnceWith(set.toObject())
			}
		},
	)

	it('строк языка в ядре нет: ни словаря, ни свойства со строками', () => {
		for (const sets of Object.values(nameSets())) {
			for (const { events } of sets) expect('translations' in events).toBe(false)
		}

		expect('translations' in new TDialog()).toBe(false)
	})
})
