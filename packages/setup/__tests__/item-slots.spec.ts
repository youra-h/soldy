/**
 * Сторож: слот элемента коллекции владелец пробрасывает целиком.
 *
 * Элементы, заданные пропом `items`, рисует владелец, и их содержимое берёт из
 * своих слотов `item-<слот>` (AGENTS.md, «Слоты элементов: статические имена со
 * scope»). Пока проброс писали руками, он был неполным и терял данные: владелец
 * отдавал элементу только `leading`, `default` и `trailing` — отметку ListBox и
 * Select, крестик Tabs и Tags, стрелки Accordion при `items` было не подменить,
 * — а scope проброса был `{ item }`: `text`, `selected` и `active` держит
 * элемент, и до слота владельца они не доходили.
 *
 * Правило: каждый слот элемента есть у владельца, и scope проброса — scope
 * слота элемента плюс ключ элемента. Слот, перенесённый из разметки элемента в
 * `items`, не теряет ни места, ни данных. Ключ — `item`, у заголовка колонки
 * Table — `column`; у ячейки Table и у дня DatePicker ключа нет: элемент уже
 * в scope источника.
 *
 * Таблица пробросов — ручная: имя слота у владельца — решение (`header`
 * секции — `item`, панель — `item-content`), а не формула. Обратная сверка —
 * каждый слот элемента стоит в таблице — ловит слот, добавленный элементу без
 * проброса. Разметку пробросов с дескрипторами сверяют conformance-тесты
 * адаптеров (`ui/vue/__tests__/slots.spec.ts`).
 */

import { describe, it, expect } from 'vitest'
import {
	AccordionDescriptor,
	AccordionItemDescriptor,
	CalendarDescriptor,
	CalendarItemDescriptor,
	DatePickerDescriptor,
	ListBoxDescriptor,
	ListBoxItemDescriptor,
	RadioGroupDescriptor,
	RadioGroupItemDescriptor,
	SelectDescriptor,
	SelectItemDescriptor,
	TableColumnDescriptor,
	TableDescriptor,
	TableRowDescriptor,
	TabsDescriptor,
	TabsItemDescriptor,
	TagsDescriptor,
	TagsItemDescriptor,
} from '../content/descriptors'
import type { IComponentDescriptor } from '../protected/define'

/** Дескрипторы по имени части — имена идут в заголовки тестов. */
const DESCRIPTORS: Readonly<Record<string, () => IComponentDescriptor>> = {
	ListBox: ListBoxDescriptor,
	'ListBox.Item': ListBoxItemDescriptor,
	Select: SelectDescriptor,
	'Select.Item': SelectItemDescriptor,
	Tabs: TabsDescriptor,
	'Tabs.Item': TabsItemDescriptor,
	Tags: TagsDescriptor,
	'Tags.Item': TagsItemDescriptor,
	Accordion: AccordionDescriptor,
	'Accordion.Item': AccordionItemDescriptor,
	RadioGroup: RadioGroupDescriptor,
	'RadioGroup.Item': RadioGroupItemDescriptor,
	Calendar: CalendarDescriptor,
	'Calendar.Item': CalendarItemDescriptor,
	DatePicker: DatePickerDescriptor,
	Table: TableDescriptor,
	'Table.Column': TableColumnDescriptor,
	'Table.Row': TableRowDescriptor,
}

/**
 * Проброс: владелец и его слот ← источник и его слот, ключ элемента в scope
 * проброса (`null` — элемент уже в scope источника).
 */
type TRelay = readonly [
	owner: string,
	slot: string,
	source: string,
	from: string,
	key: string | null,
]

const RELAYS: readonly TRelay[] = [
	['ListBox', 'item-leading', 'ListBox.Item', 'leading', 'item'],
	['ListBox', 'item', 'ListBox.Item', 'default', 'item'],
	['ListBox', 'item-trailing', 'ListBox.Item', 'trailing', 'item'],
	['ListBox', 'item-indicator-icon', 'ListBox.Item', 'indicator-icon', 'item'],

	['Select', 'item-leading', 'Select.Item', 'leading', 'item'],
	['Select', 'item', 'Select.Item', 'default', 'item'],
	['Select', 'item-trailing', 'Select.Item', 'trailing', 'item'],
	['Select', 'item-indicator-icon', 'Select.Item', 'indicator-icon', 'item'],

	['Tabs', 'item-leading', 'Tabs.Item', 'leading', 'item'],
	['Tabs', 'item', 'Tabs.Item', 'default', 'item'],
	['Tabs', 'item-trailing', 'Tabs.Item', 'trailing', 'item'],
	['Tabs', 'item-close-icon', 'Tabs.Item', 'close-icon', 'item'],

	['Tags', 'item-leading', 'Tags.Item', 'leading', 'item'],
	['Tags', 'item', 'Tags.Item', 'default', 'item'],
	['Tags', 'item-trailing', 'Tags.Item', 'trailing', 'item'],
	['Tags', 'item-close-icon', 'Tags.Item', 'close-icon', 'item'],

	['Accordion', 'item-leading-icon', 'Accordion.Item', 'leading-icon', 'item'],
	['Accordion', 'item-leading', 'Accordion.Item', 'leading', 'item'],
	['Accordion', 'item', 'Accordion.Item', 'header', 'item'],
	['Accordion', 'item-trailing', 'Accordion.Item', 'trailing', 'item'],
	['Accordion', 'item-trailing-icon', 'Accordion.Item', 'trailing-icon', 'item'],
	['Accordion', 'item-content', 'Accordion.Item', 'default', 'item'],

	['RadioGroup', 'item', 'RadioGroup.Item', 'default', 'item'],

	['Calendar', 'item', 'Calendar.Item', 'default', 'item'],
	['DatePicker', 'item', 'Calendar', 'item', null],

	['Table', 'header', 'Table.Column', 'default', 'column'],
	['Table', 'cell', 'Table.Row', 'cell', null],
]

/** Элементы коллекций: каждый их слот обязан стоять источником в `RELAYS`. */
const ITEMS = [
	'ListBox.Item',
	'Select.Item',
	'Tabs.Item',
	'Tags.Item',
	'Accordion.Item',
	'RadioGroup.Item',
	'Calendar.Item',
	'Table.Column',
	'Table.Row',
]

function descriptorOf(part: string): IComponentDescriptor {
	const factory = DESCRIPTORS[part]

	if (!factory) throw new Error(`${part}: нет строки в таблице дескрипторов`)

	return factory()
}

/** Ключи scope слота по порядку; слота нет — тест падает здесь. */
function scopeOf(part: string, slot: string): string[] {
	const declared = descriptorOf(part).slots.find((candidate) => candidate.name === slot)

	if (!declared) throw new Error(`${part}: слот «${slot}» не объявлен`)

	return Object.keys(declared.scope ?? {}).sort()
}

const title = ([owner, slot, source, from]: TRelay) => `${owner}: ${slot} ← ${source}: ${from}`

describe('сторож: слот элемента владелец пробрасывает целиком', () => {
	describe('scope проброса — scope слота элемента плюс ключ элемента', () => {
		it.each(RELAYS.map((relay) => [title(relay), relay] as const))('%s', (_title, relay) => {
			const [owner, slot, source, from, key] = relay
			const expected = key === null ? scopeOf(source, from) : [...scopeOf(source, from), key]

			expect(scopeOf(owner, slot)).toEqual(expected.sort())
		})
	})

	describe('каждый слот элемента коллекции пробрасывается владельцем', () => {
		it.each(ITEMS)('%s', (part) => {
			const relayed = RELAYS.filter(([, , source]) => source === part).map(
				([, , , from]) => from,
			)
			const slots = descriptorOf(part).slots.map((slot) => slot.name)

			expect(slots.filter((slot) => !relayed.includes(slot))).toEqual([])
		})
	})

	it('в таблице пробросов только известные части и слоты', () => {
		for (const [owner, slot, source, from] of RELAYS) {
			expect(() => scopeOf(owner, slot)).not.toThrow()
			expect(() => scopeOf(source, from)).not.toThrow()
		}
	})
})
