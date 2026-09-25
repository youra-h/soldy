/**
 * Толщина кольца Spinner — с первой отрисовки.
 *
 * `--spinner-border-width` кладёт в `:style` корня плагин раскладки. Он следил
 * только за сменой толщины, а толщина, с которой спиннер собрали, приходит в
 * инстанс без события: своему инстансу — конструктором, внешний `ctrl` держит
 * её сам. Поэтому `<Spinner :borderWidth="3">` рисовался толщиной темы, пока
 * толщину не поменяют. Умолчание `'auto'` не доходило до стиля вовсе: толщину
 * по размеру считает ядро, а плагин отдавал само `'auto'`.
 */

import { describe, it, expect, afterEach } from 'vitest'
import { nextTick } from 'vue'
import { mount } from '@vue/test-utils'
import { TSpinner } from '@soldy-ui/core'
import { Spinner } from '@soldy-ui/vue'

let wrapper: ReturnType<typeof mount> | null = null

afterEach(() => {
	wrapper?.unmount()
	wrapper = null
})

/** Толщина на корне; корня нет — тест падает здесь, а не на чтении стиля. */
function borderWidth(): string {
	const root = wrapper?.element

	if (!(root instanceof HTMLElement)) throw new Error('корня спиннера нет')

	return root.style.getPropertyValue('--spinner-border-width')
}

describe('Spinner: толщина кольца с монтирования', () => {
	it('толщина из разметки', () => {
		wrapper = mount(Spinner, { props: { borderWidth: 3 } })

		expect(borderWidth()).toBe('3px')
	})

	it('внешний ctrl с толщиной — тоже', () => {
		wrapper = mount(Spinner, { props: { ctrl: new TSpinner({ borderWidth: 5 }) } })

		expect(borderWidth()).toBe('5px')
	})

	it('auto у обычного спиннера — 1px', () => {
		wrapper = mount(Spinner)

		expect(borderWidth()).toBe('1px')
	})

	it('auto у крупного спиннера — 2px', () => {
		wrapper = mount(Spinner, { props: { size: 'xl' } })

		expect(borderWidth()).toBe('2px')
	})
})

describe('Spinner: смена толщины и размера', () => {
	it('смена толщины пропом доходит до стиля', async () => {
		const mounted = mount(Spinner, { props: { borderWidth: 3 } })

		wrapper = mounted
		await mounted.setProps({ borderWidth: 4 })

		expect(borderWidth()).toBe('4px')
	})

	it('при auto смена размера меняет толщину', async () => {
		const mounted = mount(Spinner)

		wrapper = mounted
		await mounted.setProps({ size: 'xl' })

		expect(borderWidth()).toBe('2px')
	})
})

/**
 * Толщина числом, равным автоматической, — тоже заданная толщина.
 *
 * Связка не пишет значение, равное тому, что отдаёт геттер пропа, а геттер
 * `borderWidth` при `'auto'` отдавал толщину по размеру. Число, равное ей, до
 * ядра не доходило: своё значение оставалось `'auto'`, и смена размера меняла
 * толщину, которую разметка задала явно, — 2px у `xl` вместо заданного 1px.
 */
describe('Spinner: толщина, равная автоматической', () => {
	it('заданная пропом переживает смену размера', async () => {
		const mounted = mount(Spinner)

		wrapper = mounted
		expect(borderWidth()).toBe('1px')

		await mounted.setProps({ borderWidth: 1 })
		await mounted.setProps({ size: 'xl' })

		expect(borderWidth()).toBe('1px')
	})

	it('заданная при сборке поверх внешнего ctrl — тоже', async () => {
		const ctrl = new TSpinner()

		wrapper = mount(Spinner, { props: { ctrl, borderWidth: 1 } })
		ctrl.size = 'xl'
		await nextTick()

		expect(ctrl.borderWidth).toBe(1)
		expect(borderWidth()).toBe('1px')
	})
})
