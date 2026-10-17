/**
 * Menu в настоящем браузере: фокус за подсветкой, указатель, Escape и Tab, и
 * раскладка строки пункта.
 *
 * jsdom не считает ни раскладку, ни действия браузера по умолчанию: клик из
 * Enter и пробела на кнопке-триггере, которые клавиатура меню гасит, порядок
 * Tab и `:empty` пустых обёрток. Юнит-тесты (`plugins/__tests__/menu.plugin.spec.ts`,
 * `ui/vue/__tests__/menu.spec.ts`) проверяют переходы плагинов и проводку;
 * здесь — что они складываются с браузерными.
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { render, cleanup } from 'vitest-browser-vue'
import { userEvent } from 'vitest/browser'
import { defineComponent, h, nextTick } from 'vue'
import { Button, Menu } from '@soldy-ui/vue'
import type { DescriptorSlots, MenuDescriptor } from '@soldy-ui/setup'

import '@soldy-ui/theme-oren'

type TTriggerScope = DescriptorSlots<typeof MenuDescriptor>['trigger']

const nextFrame = () => new Promise<void>((resolve) => requestAnimationFrame(() => resolve()))

/**
 * Меню между двумя кнопками страницы — чтобы было откуда прийти и куда уйти
 * по Tab. В меню — флажок в группе, действия, выключенное действие и
 * действие с подсказкой сочетания.
 */
const page = () =>
	h('div', { style: 'padding: 40px' }, [
		h('button', { class: 'so-test-before' }, 'До'),
		h(
			Menu,
			{},
			{
				trigger: ({ triggerAria, triggerDataset }: TTriggerScope) =>
					h(Button, {
						text: 'Действия',
						class: 'so-test-trigger',
						...triggerAria,
						...triggerDataset,
					}),
				default: () => [
					h(Menu.Group, { label: 'Вид' }, () => [
						h(Menu.CheckboxItem, { value: 'grid', text: 'Сетка' }),
					]),
					h(Menu.Separator),
					h(Menu.Item, { value: 'edit', text: 'Изменить' }, { trailing: () => 'Ctrl+E' }),
					h(Menu.Item, { value: 'archive', text: 'В архив', disabled: true }),
					h(Menu.Item, { value: 'remove', text: 'Удалить' }),
				],
			},
		),
		h('button', { class: 'so-test-after' }, 'После'),
	])

/** Разметка на странице, корень объявлен плагинам: `TElementPlugin` ждёт кадр. */
const show = async () => {
	render(defineComponent({ render: page }))

	await nextTick()
	await nextFrame()
	await nextFrame()
}

/** Узел по селектору; нет его — тест падает здесь, а не на чтении свойства. */
const find = (selector: string, scope: ParentNode = document): HTMLElement => {
	const element = scope.querySelector(selector)

	if (!(element instanceof HTMLElement)) throw new Error(`${selector}: HTML-узла нет`)

	return element
}

const trigger = () => find('.so-test-trigger')
const panel = () => find('.so-menu__panel')
const isOpen = () => getComputedStyle(panel()).display !== 'none'
const active = () => document.activeElement

/** Пункты меню по порядку — их корни. */
const items = () => [...panel().querySelectorAll<HTMLElement>('.so-menu-item')]

/** Строка пункта по тексту — узел с ролью, он держит фокус. */
const rowOf = (text: string): HTMLElement => {
	const row = items()
		.map((item) => find('.so-button', item))
		.find((candidate) => find('.so-button__text', candidate).textContent?.trim() === text)

	if (!row) throw new Error(`строки «${text}» нет`)

	return row
}

/** Тексты пунктов, чья строка горит: у подсвеченного фон — вуаль, у остальных его нет. */
const lit = () =>
	items()
		.map((item) => find('.so-button', item))
		.filter((row) => getComputedStyle(row).backgroundColor !== 'rgba(0, 0, 0, 0)')
		.map((row) => find('.so-button__text', row).textContent?.trim())

/** Открыть меню клавишей с триггера и дождаться, пока фокус уйдёт на первый пункт. */
const openByKey = async (key = '{ArrowDown}') => {
	trigger().focus()
	await userEvent.keyboard(key)
	await expect.poll(isOpen).toBe(true)
}

beforeEach(() => {
	document.documentElement.dataset.soTheme = 'oren'
})

afterEach(() => {
	cleanup()
})

describe('открытие', () => {
	it('клик по триггеру — фокус на панели, подсветки нет', async () => {
		await show()
		await userEvent.click(trigger())

		await expect.poll(active).toBe(panel())
		expect(trigger().getAttribute('aria-expanded')).toBe('true')
		expect(lit()).toEqual([])
	})

	it.each([['{ArrowDown}'], ['{Enter}'], [' ']])(
		'%s на триггере — фокус на первом пункте, меню не переключилось кликом кнопки',
		async (key) => {
			await show()
			await openByKey(key)

			await expect.poll(active).toBe(rowOf('Сетка'))
			// Клик кнопки из клавиши закрыл бы меню обратно: клавиша погашена
			await nextFrame()
			expect(isOpen()).toBe(true)
		},
	)

	it('ArrowUp на триггере — фокус на последнем пункте', async () => {
		await show()
		await openByKey('{ArrowUp}')

		await expect.poll(active).toBe(rowOf('Удалить'))
	})

	it('панель — в 4px под триггером, по его началу', async () => {
		await show()
		await openByKey()

		const anchor = find('.so-menu').getBoundingClientRect()
		const box = panel().getBoundingClientRect()

		expect(box.top - anchor.bottom).toBeCloseTo(4, 0)
		expect(box.left).toBeCloseTo(anchor.left, 0)
	})
})

describe('фокус за подсветкой', () => {
	it('стрелки ведут фокус, выключенный пропускается, горит один', async () => {
		await show()
		await openByKey()
		await expect.poll(active).toBe(rowOf('Сетка'))

		await userEvent.keyboard('{ArrowDown}')

		expect(active()).toBe(rowOf('Изменить'))

		await userEvent.keyboard('{ArrowDown}')

		expect(active()).toBe(rowOf('Удалить'))
		await expect.poll(lit).toEqual(['Удалить'])
	})

	it('мышь подсвечивает пункт под собой: горит один, и стрелки идут от него', async () => {
		await show()
		await openByKey()
		await expect.poll(active).toBe(rowOf('Сетка'))

		await userEvent.hover(rowOf('Изменить'))

		await expect.poll(active).toBe(rowOf('Изменить'))
		await expect.poll(lit).toEqual(['Изменить'])

		// Указатель остался над «Изменить», а стрелка увела подсветку: горит
		// подсвеченный, наведения у строки нет
		await userEvent.keyboard('{ArrowDown}')

		expect(active()).toBe(rowOf('Удалить'))
		await expect.poll(lit).toEqual(['Удалить'])
	})

	/**
	 * Указатель у выключенной строки тема гасит (`pointer-events: none`), и
	 * под ним оказывается корень пункта — к нему и подводится мышь.
	 */
	it('мышь над выключенным пунктом снимает подсветку — фокус панели', async () => {
		await show()
		await openByKey()
		await expect.poll(active).toBe(rowOf('Сетка'))

		const disabled = rowOf('В архив').parentElement

		if (!disabled) throw new Error('у строки нет корня пункта')

		await userEvent.hover(disabled)

		await expect.poll(active).toBe(panel())
		await expect.poll(lit).toEqual([])
	})
})

describe('закрытие', () => {
	it('Escape закрывает и возвращает фокус на триггер', async () => {
		await show()
		await openByKey()
		await expect.poll(active).toBe(rowOf('Сетка'))

		await userEvent.keyboard('{Escape}')

		await expect.poll(isOpen).toBe(false)
		expect(active()).toBe(trigger())
	})

	it('Enter на действии закрывает и возвращает фокус на триггер', async () => {
		await show()
		await openByKey()
		await userEvent.keyboard('{ArrowDown}')

		expect(active()).toBe(rowOf('Изменить'))

		await userEvent.keyboard('{Enter}')

		await expect.poll(isOpen).toBe(false)
		expect(active()).toBe(trigger())
	})

	it('пробел на флажке отмечает его, меню открыто', async () => {
		await show()
		await openByKey()
		await expect.poll(active).toBe(rowOf('Сетка'))

		await userEvent.keyboard(' ')

		await expect.poll(() => rowOf('Сетка').getAttribute('aria-checked')).toBe('true')
		expect(isOpen()).toBe(true)
		expect(active()).toBe(rowOf('Сетка'))
	})

	it('Tab закрывает и ведёт дальше по странице — за меню', async () => {
		await show()
		await openByKey()
		await expect.poll(active).toBe(rowOf('Сетка'))

		await userEvent.keyboard('{Tab}')

		await expect.poll(isOpen).toBe(false)
		expect(active()).toBe(find('.so-test-after'))
	})

	it('Shift+Tab закрывает и возвращает фокус на триггер', async () => {
		await show()
		await openByKey()
		await expect.poll(active).toBe(rowOf('Сетка'))

		await userEvent.keyboard('{Shift>}{Tab}{/Shift}')

		await expect.poll(isOpen).toBe(false)
		expect(active()).toBe(trigger())
	})
})

describe('строка пункта', () => {
	it('пустые обёртки значка и подсказки — :empty, места не занимают', async () => {
		await show()
		await openByKey()

		for (const text of ['Сетка', 'Изменить', 'Удалить']) {
			const icon = find('.so-menu-item__icon', rowOf(text))

			expect(icon.matches(':empty')).toBe(true)
			expect(getComputedStyle(icon).display).toBe('none')
		}

		const empty = find('.so-menu-item__shortcut', rowOf('Удалить'))
		const shortcut = find('.so-menu-item__shortcut', rowOf('Изменить'))

		expect(empty.matches(':empty')).toBe(true)
		expect(getComputedStyle(empty).display).toBe('none')
		expect(shortcut.matches(':empty')).toBe(false)
		expect(getComputedStyle(shortcut).display).not.toBe('none')
	})

	it('колонка отметок держит тексты всех пунктов на одной линии', async () => {
		await show()
		await openByKey()

		const lefts = ['Сетка', 'Изменить', 'Удалить'].map(
			(text) => find('.so-button__text', rowOf(text)).getBoundingClientRect().left,
		)

		expect(lefts[1]).toBeCloseTo(lefts[0], 0)
		expect(lefts[2]).toBeCloseTo(lefts[0], 0)
	})
})
