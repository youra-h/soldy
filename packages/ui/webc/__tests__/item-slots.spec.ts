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
 */

import { describe, it, expect } from 'vitest'
import {
	ACCORDION_ITEM_SLOTS,
	LIST_BOX_ITEM_SLOTS,
	PAGINATION_ITEM_SLOTS,
	RADIO_GROUP_ITEM_SLOTS,
	TABLE_COLUMN_SLOTS,
	TABLE_ROW_SLOTS,
	TABS_ITEM_SLOTS,
	TOASTS_ITEM_SLOTS,
	type TItemSlots,
} from '@soldy-ui/webc'
// Таблица пробросов сторожа setup — строки «владелец, слот ← источник, слот, ключ»
import RELAYS_SOURCE from '../../../setup/__tests__/item-slots.spec.ts?raw'

/**
 * Строка таблицы пробросов: `['Tabs', 'item-leading', 'Tabs.Item', 'leading', 'item'],`,
 * у таблицы — `['Table', 'header', 'Table.Column', 'default', 'column'],`.
 */
const RELAY_ROW = /\['(\w+)', '([\w-]+)', '\1\.(\w+)', '([\w-]+)', (?:'\w+'|null)\]/g

/** Пробросы владельца в его часть из таблицы сторожа: слот владельца → слот части. */
function relaysOf(owner: string, part = 'Item'): TItemSlots {
	const relays: Record<string, string> = {}

	for (const [, name, slot, target, from] of RELAYS_SOURCE.matchAll(RELAY_ROW)) {
		if (name === owner && target === part) relays[slot] = from
	}

	return relays
}

describe('карта копий образцов — строки таблицы пробросов', () => {
	it.each([
		['Tabs', TABS_ITEM_SLOTS],
		['Accordion', ACCORDION_ITEM_SLOTS],
		['RadioGroup', RADIO_GROUP_ITEM_SLOTS],
		['ListBox', LIST_BOX_ITEM_SLOTS],
		['Pagination', PAGINATION_ITEM_SLOTS],
		['Toasts', TOASTS_ITEM_SLOTS],
	] as const)('%s', (owner, slots) => {
		const relays = relaysOf(owner)

		// Сверка не впустую: строки владельца в таблице нашлись
		expect(Object.keys(relays).length).toBeGreaterThan(0)
		expect(slots).toEqual(relays)
	})

	it.each([
		['Column', TABLE_COLUMN_SLOTS],
		['Row', TABLE_ROW_SLOTS],
	] as const)('Table.%s', (part, slots) => {
		const relays = relaysOf('Table', part)

		expect(Object.keys(relays).length).toBeGreaterThan(0)
		expect(slots).toEqual(relays)
	})
})
