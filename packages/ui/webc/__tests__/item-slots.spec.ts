/**
 * Карта копий образцов — та же таблица пробросов, что у остальных адаптеров.
 *
 * Слоты элемента из данных владелец берёт у себя: его слот `item-<слот>` —
 * тот же слот элемента, и какой именно, решает таблица пробросов
 * `setup/__tests__/item-slots.spec.ts` (`header` секции — `item`, панель —
 * `item-content`). Scope у слотов Web Components нет, поэтому проброс здесь —
 * копия образца в слот элемента (`TItemSlots` шаблона владельца), и карта
 * копий сверяется со строками той таблицы, а не переписывается: добавят слот
 * элементу и строку проброса — тест потребует копию.
 *
 * У таблицы частей две, и проброс у каждой свой: `header` — в слот `default`
 * заголовка колонки (`Table.Column`), `cell` — в слот `cell` строки
 * (`Table.Row`), а строка копирует его в каждую свою ячейку.
 *
 * У меню из данных пункты двух видов — действие (`Menu.Item`) и подменю
 * (`Menu.Submenu`), — и пробросы у меню и у подменю одни: слоты одни на все
 * уровни. Подменю один слот владельца получает дважды: копией в слот своей
 * строки (`item-leading` — в `leading`) и образцом под тем же именем
 * (`item-leading` — в `item-leading`), который копирует уже в свои пункты, —
 * поэтому карт у подменю две, и с таблицей сверяется их сумма.
 *
 * Календарь копирует образец `item` в каждый день, а DatePicker отдаёт свой
 * образец `item` календарю панели образцом под тем же именем
 * (`lendTemplates`): день уже в scope слота календаря, и ключа у проброса нет.
 */

import { describe, it, expect } from 'vitest'
import {
	ACCORDION_ITEM_SLOTS,
	CALENDAR_ITEM_SLOTS,
	DATE_PICKER_CALENDAR_SLOTS,
	LIST_BOX_ITEM_SLOTS,
	MENU_ITEM_SLOTS,
	MENU_SUBMENU_SLOTS,
	MENU_SUBMENU_TEMPLATES,
	PAGINATION_ITEM_SLOTS,
	RADIO_GROUP_ITEM_SLOTS,
	SELECT_ITEM_SLOTS,
	TABLE_COLUMN_SLOTS,
	TABLE_ROW_SLOTS,
	TABS_ITEM_SLOTS,
	TAGS_ITEM_SLOTS,
	TOASTS_ITEM_SLOTS,
	type TItemSlots,
} from '@soldy-ui/webc'
// Таблица пробросов сторожа setup — строки «владелец, слот ← источник, слот, ключ»
import RELAYS_SOURCE from '../../../setup/__tests__/item-slots.spec.ts?raw'

/**
 * Строка таблицы пробросов: `['Tabs', 'item-leading', 'Tabs.Item', 'leading', 'item'],`,
 * у таблицы — `['Table', 'header', 'Table.Column', 'default', 'column'],`, у
 * подменю — `['Menu.Submenu', 'item', 'Menu.Item', 'default', 'item'],`.
 */
const RELAY_ROW = /\['([\w.]+)', '([\w-]+)', '([\w.]+)', '([\w-]+)', (?:'\w+'|null)\]/g

/** Пробросы владельца в его часть из таблицы сторожа: «слот владельца → слот части». */
function relaysOf(owner: string, source: string): string[] {
	const relays: string[] = []

	for (const [, name, slot, part, from] of RELAYS_SOURCE.matchAll(RELAY_ROW)) {
		if (name === owner && part === source) relays.push(`${slot} → ${from}`)
	}

	return relays.sort()
}

/** Карты копий — тем же видом, что пробросы: «слот владельца → слот элемента». */
const pairsOf = (...maps: TItemSlots[]): string[] =>
	maps.flatMap((map) => Object.entries(map).map(([slot, from]) => `${slot} → ${from}`)).sort()

describe('карта копий образцов — строки таблицы пробросов', () => {
	it.each([
		['Tabs', TABS_ITEM_SLOTS],
		['Accordion', ACCORDION_ITEM_SLOTS],
		['RadioGroup', RADIO_GROUP_ITEM_SLOTS],
		['ListBox', LIST_BOX_ITEM_SLOTS],
		['Tags', TAGS_ITEM_SLOTS],
		['Select', SELECT_ITEM_SLOTS],
		['Pagination', PAGINATION_ITEM_SLOTS],
		['Toasts', TOASTS_ITEM_SLOTS],
		['Calendar', CALENDAR_ITEM_SLOTS],
	] as const)('%s', (owner, slots) => {
		const relays = relaysOf(owner, `${owner}.Item`)

		// Сверка не впустую: строки владельца в таблице нашлись
		expect(relays.length).toBeGreaterThan(0)
		expect(pairsOf(slots)).toEqual(relays)
	})

	it.each([
		['Column', TABLE_COLUMN_SLOTS],
		['Row', TABLE_ROW_SLOTS],
	] as const)('Table.%s', (part, slots) => {
		const relays = relaysOf('Table', `Table.${part}`)

		expect(relays.length).toBeGreaterThan(0)
		expect(pairsOf(slots)).toEqual(relays)
	})

	it.each([
		['Menu', 'Menu.Item', [MENU_ITEM_SLOTS]],
		['Menu', 'Menu.Submenu', [MENU_SUBMENU_SLOTS, MENU_SUBMENU_TEMPLATES]],
		['Menu.Submenu', 'Menu.Item', [MENU_ITEM_SLOTS]],
		['Menu.Submenu', 'Menu.Submenu', [MENU_SUBMENU_SLOTS, MENU_SUBMENU_TEMPLATES]],
	] as const)('%s → %s', (owner, part, maps) => {
		const relays = relaysOf(owner, part)

		expect(relays.length).toBeGreaterThan(0)
		expect(pairsOf(...maps)).toEqual(relays)
	})

	it('DatePicker → Calendar', () => {
		const relays = relaysOf('DatePicker', 'Calendar')

		expect(relays.length).toBeGreaterThan(0)
		expect(pairsOf(DATE_PICKER_CALENDAR_SLOTS)).toEqual(relays)
	})
})
