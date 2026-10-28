/**
 * Группа переключателей меню доходит до своих переключателей лифтом.
 *
 * Сборка — так, как её делают адаптеры: у группы свой контекст, и проводка
 * (`TMenuRadioGroupExtension`) опускает её по лифту; у переключателя — свой
 * контекст, где проводка (`TMenuRadioItemExtension`) берёт ближайшую группу и
 * пишет её себе в `group`, и фасад пункта на его наборе — вход в коллекцию
 * меню при приёме. Группа в коллекцию не входит, и своей коллекции у неё нет:
 * её переключатели — пункты меню. Лифт здесь — дерево, как у фреймворков:
 * `up()` читает слой родителя, `down()` пишет в свой. Во Vue то же на
 * настоящем `provide`/`inject` — `ui/vue/__tests__/menu.spec.ts`; правило «в
 * группе отмечен один» — `core/__tests__/menu.spec.ts`.
 */

import { describe, it, expect } from 'vitest'
import { TMenu, TMenuRadioGroup, TMenuRadioItem } from '@soldy-ui/core'
import type { IMenuItem, TCollectionEngine } from '@soldy-ui/core'
import {
	MenuCollectionDescriptor,
	MenuCollectionRadioItemDescriptor,
	MenuDescriptor,
	MenuGroupDescriptor,
	MenuRadioGroupDescriptor,
	MenuRadioItemDescriptor,
} from '../content/descriptors'
import {
	TCollectionExtension,
	TCollectionItemExtension,
	TMenuRadioGroupExtension,
	TMenuRadioItemExtension,
} from '../content/extensions'
import { createAdapterContext } from '../protected/adapter'
import type { IAdapterContext } from '../protected/adapter'
import { CommonProfile } from '../protected/naming'
import { childOf, elevatorOf, type TElevatorLayer } from './helpers'

/** Принять контексты, как рантайм адаптера: подписка на состояние и `attach`. */
function accept(contexts: readonly IAdapterContext[]): void {
	for (const context of contexts) context.connect(CommonProfile).state.subscribe(() => {})
	for (const context of contexts) context.attach()
}

/** Меню — свой контекст и фасад меню на его наборе. */
function mountMenu(layer: TElevatorLayer): TCollectionEngine<IMenuItem, any> {
	const own = createAdapterContext(MenuDescriptor(), { ctrl: new TMenu({ open: true }) })
	const facade = createAdapterContext(
		MenuCollectionDescriptor(),
		{ options: { owner: own.instance } },
		{ bundle: own.bundle },
	).use(TCollectionExtension, { elevator: elevatorOf(layer) })

	accept([own, facade])

	return facade.instance.engine
}

/** Группа переключателей разметкой: опускает себя детям. */
function mountRadioGroup(layer: TElevatorLayer, props: object): TMenuRadioGroup {
	const own = createAdapterContext(MenuRadioGroupDescriptor(), { props }).use(
		TMenuRadioGroupExtension,
		{ elevator: elevatorOf(layer) },
	)

	accept([own])

	return own.instance
}

/** Обычная группа меню разметкой — обёртка без своей проводки. */
function mountGroup(props: object): void {
	accept([createAdapterContext(MenuGroupDescriptor(), { props })])
}

/** Переключатель разметкой — два контекста на одном наборе, как у Vue. */
function mountRadio(layer: TElevatorLayer, props: object, ctrl?: TMenuRadioItem): TMenuRadioItem {
	const elevator = elevatorOf(layer)
	const own = createAdapterContext(MenuRadioItemDescriptor(), { ctrl, props }).use(
		TMenuRadioItemExtension,
		{ elevator },
	)
	const item = createAdapterContext(
		MenuCollectionRadioItemDescriptor(),
		{ props },
		{ bundle: own.bundle },
	).use(TCollectionItemExtension, { adapter: own, elevator })

	accept([item, own])

	return own.instance
}

describe('группа переключателей доходит до переключателя лифтом', () => {
	it('переключатель в группе — её, вне группы — group: null; пункты — в коллекции меню', () => {
		const menuLayer = childOf()
		const engine = mountMenu(menuLayer)
		const sortLayer = childOf(menuLayer)
		const sort = mountRadioGroup(sortLayer, { label: 'Сортировка' })
		const name = mountRadio(childOf(sortLayer), { value: 'name', text: 'По имени' })
		const date = mountRadio(childOf(sortLayer), { value: 'date', text: 'По дате' })
		const loose = mountRadio(childOf(menuLayer), { value: 'loose', text: 'Сам по себе' })

		expect([name.group, date.group]).toEqual([sort, sort])
		expect(loose.group).toBeNull()
		// Группа в коллекцию не входит: её переключатели — пункты меню
		expect(engine.extensions.batch.items).toEqual([name, date, loose])
	})

	it('сквозь обычную группу меню и до ближайшей группы переключателей', () => {
		const menuLayer = childOf()

		mountMenu(menuLayer)

		const sortLayer = childOf(menuLayer)
		const sort = mountRadioGroup(sortLayer, { label: 'Сортировка' })
		const viewLayer = childOf(sortLayer)

		mountGroup({ label: 'Вид' })

		const name = mountRadio(childOf(viewLayer), { value: 'name' })
		const orderLayer = childOf(sortLayer)
		const order = mountRadioGroup(orderLayer, { label: 'Порядок' })
		const asc = mountRadio(childOf(orderLayer), { value: 'asc' })

		expect(name.group).toBe(sort)
		expect(asc.group).toBe(order)
	})

	it('группу, которую переключателю дал код, место вне группы не стирает', () => {
		const menuLayer = childOf()

		mountMenu(menuLayer)

		const sort = new TMenuRadioGroup()
		const ctrl = new TMenuRadioItem({ value: 'name', group: sort })

		expect(mountRadio(childOf(menuLayer), {}, ctrl).group).toBe(sort)
	})

	it('значение группы — за отметкой в коллекции меню, отметка — за значением', () => {
		const menuLayer = childOf()
		const engine = mountMenu(menuLayer)
		const sortLayer = childOf(menuLayer)
		const sort = mountRadioGroup(sortLayer, { value: 'date' })
		const name = mountRadio(childOf(sortLayer), { value: 'name' })
		const date = mountRadio(childOf(sortLayer), { value: 'date' })
		const { menu, selection } = engine.extensions

		// Переключатель со значением группы отмечен с приходом в коллекцию
		expect(selection.selected).toEqual([date])

		menu.checkItem(name)

		expect(selection.selected).toEqual([name])
		expect(sort.value).toBe('name')

		sort.value = 'date'

		expect(selection.selected).toEqual([date])
	})

	it('отметка из разметки (`selected`) — новая в группе: значение за ней', () => {
		const menuLayer = childOf()
		const engine = mountMenu(menuLayer)
		const sortLayer = childOf(menuLayer)
		const sort = mountRadioGroup(sortLayer, { value: 'name' })
		const name = mountRadio(childOf(sortLayer), { value: 'name' })
		const date = mountRadio(childOf(sortLayer), { value: 'date', selected: true })

		expect(engine.extensions.selection.selected).toEqual([date])
		expect(name.aria.get('aria-checked')).toBe('false')
		expect(sort.value).toBe('date')
	})
})
