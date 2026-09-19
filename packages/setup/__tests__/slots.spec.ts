/**
 * Слоты как третья категория контракта.
 *
 * До объявления слоты жили только в разметке Vue-шаблонов, и «одна структура
 * во всех фреймворках» ничем не проверялась. Эти тесты сторожат сам контракт;
 * его соблюдение адаптерами проверяют conformance-тесты в ui-пакетах.
 *
 * Тип слотов дескриптора выводится из того же объявления, второй записи у него
 * нет. Проверки типов — `expectTypeOf` и `@ts-expect-error`: их ловит шаг CI
 * «Типы — Setup», а не vitest.
 */

import { describe, it, expect, expectTypeOf } from 'vitest'
import {
	defineComponent,
	defineType,
	normalizeContribution,
	ButtonDescriptor,
	ComponentViewDescriptor,
	ComponentDescriptor,
	ControlDescriptor,
	ListBoxItemDescriptor,
	TagsItemDescriptor,
	DEFAULT_SLOT,
	resolveSlotName,
	isScopedSlot,
	slotNames,
} from '@soldy/setup'
import type { DescriptorSlots, TEmptySlotScope } from '@soldy/setup'
import { required } from './helpers'

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
			contribution: { slots: { default: { scope: { text: defineType<string>(String) } } } },
		})

		expect(child.getSlots()).toHaveLength(1)
		expect(child.getSlots()[0].scope).toEqual({ text: defineType<string>(String) })
		// В типе — так же: scope наследника вместо пустого родительского
		expectTypeOf<DescriptorSlots<() => typeof child>>().toEqualTypeOf<{
			default: { text: string }
		}>()
	})

	it('Button уточняет унаследованный default, добавляя scope', () => {
		const inherited = ComponentViewDescriptor().getSlots()[0]
		const refined = required(
			ButtonDescriptor()
				.getSlots()
				.find((slot) => slot.name === 'default'),
			'слот default у Button',
		)

		expect(isScopedSlot(inherited.scope)).toBe(false)
		expect(isScopedSlot(refined.scope)).toBe(true)
		expect(Object.keys(required(refined.scope, 'scope слота default'))).toEqual(['text'])
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

describe('тип слотов выводится из объявления', () => {
	it('Button: scope из defineType, слот без scope — пустой', () => {
		expectTypeOf<DescriptorSlots<typeof ButtonDescriptor>>().toEqualTypeOf<{
			leading: TEmptySlotScope
			default: { text: string }
			trailing: TEmptySlotScope
		}>()
	})

	it('дескриптор без своих слотов получает унаследованные: default у Control', () => {
		expect(slotNames(ControlDescriptor())).toEqual(['default'])
		expectTypeOf<DescriptorSlots<typeof ControlDescriptor>>().toEqualTypeOf<{
			default: TEmptySlotScope
		}>()
	})

	it('в типе есть все объявленные слоты: close-icon у TagsItem, indicator-icon у ListBoxItem', () => {
		expect(slotNames(TagsItemDescriptor())).toContain('close-icon')
		expect(slotNames(ListBoxItemDescriptor())).toContain('indicator-icon')
		expectTypeOf<
			DescriptorSlots<typeof TagsItemDescriptor>['close-icon']
		>().toEqualTypeOf<TEmptySlotScope>()
		expectTypeOf<
			DescriptorSlots<typeof ListBoxItemDescriptor>['indicator-icon']
		>().toEqualTypeOf<{
			selected: boolean
		}>()
	})

	it('значение scope без defineType не компилируется: тип данных слота взять неоткуда', () => {
		const descriptor = defineComponent({
			contribution: {
				slots: {
					default: {
						scope: {
							// @ts-expect-error — `String` без `defineType` не несёт тип значения
							text: String,
						},
					},
				},
			},
		})

		// В рантайме слоту хватает состава ключей: ошибка только в типах
		expect(isScopedSlot(descriptor.getSlots()[0].scope)).toBe(true)
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
