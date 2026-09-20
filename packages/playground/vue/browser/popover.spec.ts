/**
 * Popover в настоящем браузере: фокус, порядок Tab и место панели.
 *
 * Порядок Tab ведёт браузер, и jsdom его не считает: юнит-тесты
 * (`ui/vue/__tests__/popover.spec.ts`) проверяют только переходы, которые
 * делает сам плагин фокуса. Здесь — что они складываются с браузерными в
 * порядок «триггер → панель → то, что за поповером», хотя панель
 * телепортирована в конец `body`. Раскладку jsdom тоже не считает: отступ
 * панели от триггера меряется только здесь.
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { render, cleanup } from 'vitest-browser-vue'
import { userEvent } from 'vitest/browser'
import { defineComponent, h, nextTick } from 'vue'
import { Button, Popover } from '@soldy/ui-vue'
import type { DescriptorSlots, PopoverDescriptor } from '@soldy/setup'

import '@soldy/theme-oren'

type TTriggerScope = DescriptorSlots<typeof PopoverDescriptor>['trigger']

const nextFrame = () => new Promise<void>((resolve) => requestAnimationFrame(() => resolve()))

/**
 * Поповер между двумя кнопками страницы — чтобы было откуда прийти и куда
 * уйти по Tab. В панели две кнопки и крестик: три остановки.
 */
const page = () =>
	h('div', { style: 'padding: 40px' }, [
		h('button', { class: 's-test-before' }, 'До'),
		h(
			Popover,
			{ aria_label: 'Проверка' },
			{
				trigger: ({ triggerAria, triggerDataset }: TTriggerScope) =>
					h(Button, {
						text: 'Открыть',
						class: 's-test-trigger',
						...triggerAria,
						...triggerDataset,
					}),
				default: () => [
					h('button', { class: 's-test-first' }, 'Первая'),
					h('button', { class: 's-test-second' }, 'Вторая'),
				],
			},
		),
		h('button', { class: 's-test-after' }, 'После'),
	])

/** Разметка на странице, корень объявлен плагинам: `TElementPlugin` ждёт кадр. */
const show = async () => {
	render(defineComponent({ render: page }))

	await nextTick()
	await nextFrame()
	await nextFrame()
}

/** Узел по селектору; нет его — тест падает здесь, а не на чтении свойства. */
const find = (selector: string): HTMLElement => {
	const element = document.querySelector(selector)

	if (!(element instanceof HTMLElement)) throw new Error(`${selector}: HTML-узла нет`)

	return element
}

const trigger = () => find('.s-test-trigger')
const panel = () => find('.s-popover__panel')
const isOpen = () => getComputedStyle(panel()).display !== 'none'
const active = () => document.activeElement

const tab = () => userEvent.keyboard('{Tab}')

const shiftTab = () => userEvent.keyboard('{Shift>}{Tab}{/Shift}')

/** Открыть кликом и дождаться, пока фокус уйдёт в панель. */
const open = async () => {
	await userEvent.click(trigger())
	await expect.poll(active).toBe(find('.s-test-first'))
}

beforeEach(() => {
	document.documentElement.dataset.theme = 'oren'
})

afterEach(() => {
	cleanup()
})

describe('открытие', () => {
	it('клик по триггеру открывает панель и уводит фокус на её первую остановку', async () => {
		await show()
		await open()

		expect(isOpen()).toBe(true)
		expect(trigger().getAttribute('aria-expanded')).toBe('true')
	})

	it('панель — в 8px под триггером, по его началу', async () => {
		await show()
		await open()

		const anchor = find('.s-popover').getBoundingClientRect()
		const box = panel().getBoundingClientRect()

		expect(Math.round(box.top - anchor.bottom)).toBe(8)
		expect(Math.round(box.left)).toBe(Math.round(anchor.left))
	})

	it('клик по открытому триггеру закрывает панель', async () => {
		await show()
		await open()
		await userEvent.click(trigger())

		await expect.poll(isOpen).toBe(false)
		expect(active()).toBe(trigger())
	})
})

describe('Tab: панель стоит в порядке сразу за триггером', () => {
	it('Tab по панели и из неё — к тому, что за поповером, панель закрывается', async () => {
		await show()
		await open()

		await tab()
		expect(active()).toBe(find('.s-test-second'))

		await tab()
		expect(active()).toBe(find('.s-popover__close'))

		await tab()
		expect(active()).toBe(find('.s-test-after'))
		await expect.poll(isOpen).toBe(false)
	})

	it('Shift+Tab с первой остановки — на триггер, панель открыта; Tab с триггера — снова в панель', async () => {
		await show()
		await open()

		await shiftTab()
		expect(active()).toBe(trigger())
		expect(isOpen()).toBe(true)

		await tab()
		expect(active()).toBe(find('.s-test-first'))
	})

	it('Shift+Tab с триггера уходит назад по странице и закрывает панель', async () => {
		await show()
		await open()

		await shiftTab()
		await shiftTab()

		expect(active()).toBe(find('.s-test-before'))
		await expect.poll(isOpen).toBe(false)
	})

	it('закрытая панель в порядке Tab не участвует', async () => {
		await show()

		find('.s-test-before').focus()
		await tab()
		expect(active()).toBe(trigger())

		await tab()
		expect(active()).toBe(find('.s-test-after'))
	})
})

describe('закрытие и возврат фокуса', () => {
	it('Escape закрывает и возвращает фокус на триггер', async () => {
		await show()
		await open()
		await userEvent.keyboard('{Escape}')

		await expect.poll(isOpen).toBe(false)
		expect(active()).toBe(trigger())
	})

	it('крестик закрывает и возвращает фокус на триггер', async () => {
		await show()
		await open()
		await userEvent.click(find('.s-popover__close'))

		await expect.poll(isOpen).toBe(false)
		expect(active()).toBe(trigger())
	})

	it('клик мимо закрывает, фокус остаётся там, куда нажали', async () => {
		await show()
		await open()
		await userEvent.click(find('.s-test-after'))

		await expect.poll(isOpen).toBe(false)
		expect(active()).toBe(find('.s-test-after'))
	})
})
