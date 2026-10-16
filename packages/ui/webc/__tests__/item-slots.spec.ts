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
 */

import { describe, it, expect } from 'vitest'
import {
	ACCORDION_ITEM_SLOTS,
	LIST_BOX_ITEM_SLOTS,
	RADIO_GROUP_ITEM_SLOTS,
	TABS_ITEM_SLOTS,
	type TItemSlots,
} from '@soldy-ui/webc'
// Таблица пробросов сторожа setup — строки «владелец, слот ← источник, слот, ключ»
import RELAYS_SOURCE from '../../../setup/__tests__/item-slots.spec.ts?raw'

/** Строка таблицы пробросов: `['Tabs', 'item-leading', 'Tabs.Item', 'leading', 'item'],`. */
const RELAY_ROW = /\['(\w+)', '([\w-]+)', '\1\.Item', '([\w-]+)', 'item'\]/g

/** Пробросы владельца из таблицы сторожа: слот владельца → слот элемента. */
function relaysOf(owner: string): TItemSlots {
	const relays: Record<string, string> = {}

	for (const [, name, slot, from] of RELAYS_SOURCE.matchAll(RELAY_ROW)) {
		if (name === owner) relays[slot] = from
	}

	return relays
}

describe('карта копий образцов — строки таблицы пробросов', () => {
	it.each([
		['Tabs', TABS_ITEM_SLOTS],
		['Accordion', ACCORDION_ITEM_SLOTS],
		['RadioGroup', RADIO_GROUP_ITEM_SLOTS],
		['ListBox', LIST_BOX_ITEM_SLOTS],
	] as const)('%s', (owner, slots) => {
		const relays = relaysOf(owner)

		// Сверка не впустую: строки владельца в таблице нашлись
		expect(Object.keys(relays).length).toBeGreaterThan(0)
		expect(slots).toEqual(relays)
	})
})
