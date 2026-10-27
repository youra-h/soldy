import { describe, it, expect } from 'vitest'
import { required } from './helpers'
import {
	TComponentView,
	TIcon,
	TButton,
	TCollectionEngine,
	TBatchExtension,
	TMenu,
	TListBox,
} from '@soldy-ui/core'
import type { IListBoxItem } from '@soldy-ui/core'
import {
	IconDescriptor,
	ButtonDescriptor,
	MenuDescriptor,
	ListBoxDescriptor,
	ListBoxCollectionDescriptor,
} from '../content/descriptors'
import { createAdapterContext, type IAdapterContext } from '../protected/adapter'
import { CommonProfile } from '../protected/naming'

/**
 * Контракт границы core → ui.
 *
 * Внутри объекта состояние можно мутировать сколько угодно, но то, что
 * пересекает границу через геттер, обязано быть значением, а не ручкой на
 * живое состояние. Иначе идентичность не меняется, и ни один фреймворк не
 * увидит изменения — раньше это компенсировалось клонированием в адаптере
 * (cloneValue), с эвристиками и разной реализацией на каждый фреймворк.
 *
 * Способа два, оба уже применяются:
 *   - valueOf() отдаёт снимок (TClasses, драйвер коллекции);
 *   - объект заменяется целиком (layout-плагины, TFrameLayoutPlugin).
 *
 * Эти тесты ловят возврат к мутации на месте.
 */

/** Читает значение пропа так же, как это делает адаптер. */
function read(ctx: IAdapterContext, name: string): unknown {
	const { lines, owners } = ctx.connect(CommonProfile)

	return required(
		lines.find((line) => line.spec.name.name === name),
		`проп ${name}`,
	).read(owners)
}

describe('Составные props меняют идентичность при изменении', () => {
	it('layout_styles: плагин заменяет объект, а не мутирует', () => {
		const icon = new TIcon({ width: 16 })
		const ctx = createAdapterContext(IconDescriptor(), { ctrl: icon })

		const before = read(ctx, 'styles')

		icon.width = 24

		const after = read(ctx, 'styles')

		expect(after).not.toBe(before)
		expect(JSON.stringify(after)).not.toBe(JSON.stringify(before))
	})

	it('attrs: набор нативных атрибутов отдаёт снимок, а не ссылку', () => {
		const button = new TButton({ tag: 'button' })
		const ctx = createAdapterContext(ButtonDescriptor(), { ctrl: button })

		const before = read(ctx, 'attrs')

		button.disabled = true

		const after = read(ctx, 'attrs')

		expect(before).toEqual({})
		expect(after).toEqual({ disabled: 'disabled' })
		expect(after).not.toBe(before)
	})

	it('items: драйвер коллекции отдаёт свежий массив через valueOf()', () => {
		type Item = { id: number }

		const batch = new TBatchExtension<Item>()
		const engine = new TCollectionEngine<Item, { batch: TBatchExtension<Item> }>({
			extensions: { batch },
		})

		// Так читает TPropSpec.read: у объекта со своим valueOf() — результат вызова
		const driver = engine.getCore().driver
		const before = driver.valueOf()

		batch.set([{ id: 1 }])

		const after = driver.valueOf()

		expect(before).toEqual([])
		expect(after).toHaveLength(1)
		expect(after).not.toBe(before)
		// снимок отделён от самого драйвера
		expect(driver.valueOf()).not.toBe(driver)
	})

	/**
	 * The consumer hears `change:items` with the list as its argument and may
	 * keep it — in a Solid signal, say. A live reference to the storage would
	 * change under it with no event, and the framework would not see it.
	 */
	it('items: change:items отдаёт потребителю снимок состава', () => {
		const owner = createAdapterContext(ListBoxDescriptor(), { ctrl: new TListBox() })
		const facade = createAdapterContext(
			ListBoxCollectionDescriptor(),
			{ options: { owner: owner.instance } },
			{ bundle: owner.bundle },
		)
		const heard: unknown[] = []

		facade.connect(CommonProfile).events.listen((name, args) => {
			if (name === 'change:items') heard.push(args[0])
		})

		const { plain } = facade.instance.extensions
		const first = plain.push({ value: 'a' })

		plain.push({ value: 'b' })
		plain.remove(first)

		// The lists are read only now, after every change: each must still be
		// what it was when heard
		const values = (items: unknown): unknown =>
			Array.isArray(items) ? items.map((item: IListBoxItem) => item.value) : items

		expect(heard.map(values)).toEqual([['a'], ['a', 'b'], ['b']])
	})

	/**
	 * Точку вызова контекстного меню разметка отдаёт якорю панели: смена точки
	 * обязана дойти новым объектом, а та же точка — остаться прежним, иначе
	 * адаптер перерисовывал бы панель на каждый повтор.
	 */
	it('point меню: новый объект на смену точки, та же точка — тот же объект', () => {
		const menu = new TMenu({ openOn: 'contextmenu' })
		const ctx = createAdapterContext(MenuDescriptor(), { ctrl: menu })

		expect(read(ctx, 'point')).toBe(null)

		menu.point = { x: 10, y: 20 }

		const first = read(ctx, 'point')

		expect(first).toEqual({ x: 10, y: 20 })

		menu.point = { x: 10, y: 20 }

		expect(read(ctx, 'point')).toBe(first)

		menu.point = { x: 30, y: 20 }

		expect(read(ctx, 'point')).not.toBe(first)
		expect(read(ctx, 'point')).toEqual({ x: 30, y: 20 })
	})
})

describe('События эмитятся только при реальном изменении', () => {
	it('повторный show() на видимом компоненте молчит', () => {
		const component = new TComponentView({ visible: true })
		const seen: string[] = []

		component.events.on('show:before', () => seen.push('show:before'))
		component.events.on('show', () => seen.push('show'))
		component.events.on('show:after', () => seen.push('show:after'))

		component.show()

		expect(seen).toEqual([])
	})

	it('show() после hide() эмитит полную последовательность', () => {
		const component = new TComponentView({ visible: true })

		component.hide()

		const seen: string[] = []

		component.events.on('show:before', () => seen.push('show:before'))
		component.events.on('show', () => seen.push('show'))
		component.events.on('show:after', () => seen.push('show:after'))

		component.show()

		expect(seen).toEqual(['show:before', 'show', 'show:after'])
		expect(component.visible).toBe(true)
	})
})
