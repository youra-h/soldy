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
} from '@soldy-ui/setup'
import type { DescriptorSlots, TEmptySlotScope } from '@soldy-ui/setup'

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

/**
 * Слоты описывают разметку, а она не наследуется: у каждого компонента в
 * каждом адаптере шаблон свой. Пропсы, события и плагины наследник получает от
 * `extends`, слоты — нет: дескриптор объявляет ровно те, что рисует его
 * шаблон. Унаследованный `default` ComponentView обещал содержимое Icon, Input
 * и CheckBox, а их разметка его не рисует.
 */
describe('слоты не наследуются', () => {
	/** Родитель стенда со слотами: наследники ниже объявляют свои или ничего. */
	const parent = defineComponent({ contribution: { slots: { default: {}, leading: {} } } })

	it('наследник получает ровно свои слоты: одноимённый — свой, прочих родителя нет', () => {
		const child = defineComponent({
			extends: parent,
			contribution: { slots: { default: { scope: { text: defineType<string>(String) } } } },
		})

		expect(slotNames(child)).toEqual(['default'])
		expect(child.slots[0].scope).toEqual({ text: defineType<string>(String) })
		// В типе — так же: свой default, без leading родителя
		expectTypeOf<DescriptorSlots<() => typeof child>>().toEqualTypeOf<{
			default: { text: string }
		}>()
	})

	it('наследник без своего объявления слотов не имеет — ни в рантайме, ни в типе', () => {
		const child = defineComponent({ extends: parent })

		expect(child.slots).toEqual([])
		expectTypeOf<keyof DescriptorSlots<() => typeof child>>().toEqualTypeOf<never>()
	})

	it('Button — свои слоты в порядке объявления, у его предка Control — ни одного', () => {
		expect(slotNames(ComponentViewDescriptor())).toEqual(['default'])
		expect(slotNames(ButtonDescriptor())).toEqual(['leading', 'default', 'trailing'])
		expect(ControlDescriptor().slots).toEqual([])
		expectTypeOf<keyof DescriptorSlots<typeof ControlDescriptor>>().toEqualTypeOf<never>()
	})

	it('невизуальный слой слотов не имеет', () => {
		expect(ComponentDescriptor().slots).toEqual([])
	})

	it('слоты дескриптора заморожены: он один на все монтирования', () => {
		const descriptor = ButtonDescriptor()

		// Тип правку не пропускает (`readonly`), рантайм — тоже
		expect(Reflect.set(descriptor.slots, 'length', 0)).toBe(false)
		expect(descriptor.slots).toHaveLength(3)
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
		expect(isScopedSlot(descriptor.slots[0].scope)).toBe(true)
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
			'leading',
			'children',
			'trailing',
		])
	})
})
