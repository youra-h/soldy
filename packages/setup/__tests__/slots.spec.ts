/**
 * Слоты как третья категория контракта.
 *
 * До объявления слоты жили только в разметке Vue-шаблонов, и «одна структура
 * во всех фреймворках» ничем не проверялась. Эти тесты сторожат сам контракт;
 * его соблюдение адаптерами проверяют conformance-тесты в ui-пакетах.
 */

import { describe, it, expect } from 'vitest'
import {
	defineComponent,
	normalizeContribution,
	ButtonDescriptor,
	ComponentViewDescriptor,
	ComponentDescriptor,
	DEFAULT_SLOT,
	resolveSlotName,
	isScopedSlot,
	slotNames,
} from '@soldy/setup'

describe('normalizeContribution · slots', () => {
	it('переносит имя из ключа словаря в декларацию', () => {
		const { slots } = normalizeContribution({
			slots: { leading: { description: 'перед' }, trailing: {} },
		})

		expect(slots).toEqual([
			{ name: 'leading', scope: undefined, description: 'перед' },
			{ name: 'trailing', scope: undefined, description: undefined },
		])
	})

	it('слоты не получают namespace, в отличие от props и events', () => {
		const { props, events, slots } = normalizeContribution(
			{ props: { styles: {} }, events: ['ready'], slots: { leading: {} } },
			'layout',
		)

		expect(props[0].name.getName()).toBe('layout:styles')
		expect(events[0].getName()).toBe('layout:ready')
		// Слоты принадлежат компоненту: плагин не рендерит и слотов не имеет
		expect(slots[0].name).toBe('leading')
	})
})

describe('наследование слотов', () => {
	it('наследник получает слоты родителя', () => {
		expect(slotNames(ComponentViewDescriptor())).toEqual(['default'])
		// Button добавляет leading/trailing к унаследованному default
		expect(slotNames(ButtonDescriptor())).toEqual(['default', 'leading', 'trailing'])
	})

	it('одноимённый слот наследника перекрывает родительский, не дублируя', () => {
		const parent = defineComponent({ contribution: { slots: { default: {} } } })

		const child = defineComponent({
			extends: parent,
			contribution: { slots: { default: { scope: { text: String } } } },
		})

		expect(child.getSlots()).toHaveLength(1)
		expect(child.getSlots()[0].scope).toEqual({ text: String })
	})

	it('Button уточняет унаследованный default, добавляя scope', () => {
		const inherited = ComponentViewDescriptor().getSlots()[0]
		const refined = ButtonDescriptor()
			.getSlots()
			.find((slot) => slot.name === 'default')!

		expect(isScopedSlot(inherited.scope)).toBe(false)
		expect(isScopedSlot(refined.scope)).toBe(true)
		expect(Object.keys(refined.scope!)).toEqual(['text'])
	})

	it('невизуальный слой слотов не имеет', () => {
		expect(ComponentDescriptor().getSlots()).toEqual([])
	})

	it('getSlots отдаёт копию, а не внутренний массив', () => {
		const descriptor = ButtonDescriptor()
		const first = descriptor.getSlots()

		first.length = 0

		expect(descriptor.getSlots()).toHaveLength(3)
	})
})

describe('имена слотов', () => {
	it('преобразуется только default — остальные одинаковы везде', () => {
		expect(resolveSlotName('leading', 'children')).toBe('leading')
		expect(resolveSlotName(DEFAULT_SLOT, 'children')).toBe('children')
		expect(resolveSlotName(DEFAULT_SLOT, 'default')).toBe('default')
	})

	it('slotNames подставляет имя по умолчанию адаптера', () => {
		expect(slotNames(ButtonDescriptor(), 'children')).toEqual([
			'children',
			'leading',
			'trailing',
		])
	})
})
