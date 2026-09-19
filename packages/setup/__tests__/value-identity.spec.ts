import { describe, it, expect } from 'vitest'
import { required } from './helpers'
import { TComponentView, TSpinner, TButton, TCollectionEngine, TBatchExtension } from '@soldy/core'
import { SpinnerDescriptor, ButtonDescriptor } from '../descriptors'
import { createAdapterContext, type IAdapterContext } from '../adapter'

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
	return required(
		ctx.accessor.getProps(true).find((p) => p.name.name === name),
		`проп ${name}`,
	).value
}

describe('Составные props меняют идентичность при изменении', () => {
	it('layout_styles: плагин заменяет объект, а не мутирует', () => {
		const spinner = new TSpinner({ borderWidth: 2 })
		const ctx = createAdapterContext(SpinnerDescriptor(), { ctrl: spinner })

		const before = read(ctx, 'styles')

		spinner.borderWidth = 8

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

		// accessor.getValue делает ровно это: val?.valueOf?.() ?? val
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
