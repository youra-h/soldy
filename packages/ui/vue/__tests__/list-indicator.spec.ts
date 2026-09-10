/**
 * `indicator` — отметка выбранного элемента у ListBox и Select.
 *
 * Свойство списка, а не элемента: сторона одна на весь список, элемент читает
 * её у владельца. Здесь проверяется то, что видно только в разметке —
 * появление иконки, сторона строки, подмена слотом и невидимость отметки для
 * скринридера. Проброс значения вниз проверяют тесты ядра.
 */

import { describe, it, expect, afterEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { nextTick } from 'vue'
import { ListBox, ListBoxItem } from '@soldy/ui-vue'
import ListBoxHarness from './ListBox.test.vue'
import SelectHarness from './Select.test.vue'

let wrapper: ReturnType<typeof mount> | null = null

/** Панель Select телепортируется в body — обёртку обязательно размонтировать. */
afterEach(() => {
	wrapper?.unmount()
	wrapper = null
	document.body.innerHTML = ''
})

const renderListBox = (props: Record<string, unknown> = {}) => {
	wrapper = mount(ListBoxHarness, { props, attachTo: document.body })

	return wrapper
}

const listItems = () => [...document.querySelectorAll('.s-list-box-item')]

/** Выбор элемента ListBox — клик по строке. */
const clickItem = async (index: number) => {
	;(listItems()[index].querySelector('.s-button') as HTMLElement).click()

	await nextTick()
}

/**
 * С какой стороны от текста стоит отметка.
 *
 * Обёрток у слотов `Button` нет, поэтому сторона читается порядком узлов —
 * ровно тем, что увидит пользователь.
 */
const sideOf = (root: Element, indicatorClass: string): 'start' | 'end' | null => {
	const indicator = root.querySelector(indicatorClass)
	const text = root.querySelector('.s-button__text')

	if (!indicator || !text) return null

	return indicator.compareDocumentPosition(text) & Node.DOCUMENT_POSITION_FOLLOWING
		? 'start'
		: 'end'
}

describe('ListBox: отметка выбранного', () => {
	it('без indicator обёртки нет вовсе — разметка не меняется', async () => {
		renderListBox()

		await clickItem(0)

		expect(document.querySelectorAll('.s-list-box-item__indicator')).toHaveLength(0)
	})

	/**
	 * Обёртка стоит у всех, включая невыбранных: она резервирует место, иначе
	 * строки прыгали бы при выборе. Иконка внутри — только у выбранного.
	 */
	it('обёртка резервирует место у каждого элемента, иконка — только у выбранного', async () => {
		renderListBox({ indicator: 'start' })

		expect(document.querySelectorAll('.s-list-box-item__indicator')).toHaveLength(3)
		expect(document.querySelectorAll('.s-list-box-item__indicator svg')).toHaveLength(0)

		await clickItem(1)

		const icons = listItems().map((item) => !!item.querySelector('.s-list-box-item__indicator svg'))

		expect(icons).toEqual([false, true, false])
	})

	it('start ставит отметку перед текстом, end — после', async () => {
		renderListBox({ indicator: 'start' })
		await clickItem(0)

		expect(sideOf(listItems()[0], '.s-list-box-item__indicator')).toBe('start')

		await wrapper?.setProps({ indicator: 'end' })
		await nextTick()

		expect(sideOf(listItems()[0], '.s-list-box-item__indicator')).toBe('end')
	})

	/**
	 * Отметка декоративна: состояние скринридеру объявляет `aria-selected`, и
	 * второй источник того же факта дал бы двойное объявление.
	 */
	it('отметка не попадает в дерево доступности', async () => {
		renderListBox({ indicator: 'start' })
		await clickItem(0)

		expect(document.querySelector('.s-list-box-item__indicator')?.getAttribute('aria-hidden')).toBe(
			'true',
		)
	})

	it('в multiple отметка стоит у каждого выбранного', async () => {
		renderListBox({ indicator: 'start', mode: 'multiple' })

		await clickItem(0)
		await clickItem(2)

		expect(
			listItems().map((item) => !!item.querySelector('.s-list-box-item__indicator svg')),
		).toEqual([true, false, true])
	})

	it('иконка подменяется слотом indicator-icon без правки библиотеки', async () => {
		wrapper = mount(
			{
				components: { ListBox, ListBoxItem },
				template: `
					<ListBox indicator="start">
						<ListBoxItem value="a" text="A">
							<template #indicator-icon="{ selected }">
								<b class="custom" v-if="selected">V</b>
							</template>
						</ListBoxItem>
					</ListBox>
				`,
			},
			{ attachTo: document.body },
		)

		await clickItem(0)

		expect(document.querySelector('.s-list-box-item__indicator .custom')).toBeTruthy()
		expect(document.querySelector('.s-list-box-item__indicator svg')).toBeNull()
	})

	/**
	 * Сторона логическая, а не `left`/`right`: `dir` стоит на корне элемента,
	 * строка — flex, поэтому в RTL `start` сам оказывается справа и правил в
	 * теме под это не нужно.
	 */
	it('сторона логическая: в rtl разметка та же, переворачивает её dir', async () => {
		renderListBox({ indicator: 'start', direction: 'rtl' })
		await clickItem(0)

		expect(document.querySelector('.s-list-box')?.getAttribute('dir')).toBe('rtl')
		// Разметка не переставлена: порядок узлов тот же, край меняет `dir`
		expect(sideOf(listItems()[0], '.s-list-box-item__indicator')).toBe('start')
	})
})

describe('Select: отметка выбранной опции', () => {
	const options = () => [...document.querySelectorAll('[role="option"]')]

	const renderSelect = async (props: Record<string, unknown> = {}) => {
		wrapper = mount(SelectHarness, { props, attachTo: document.body })

		// Опции регистрируются при монтировании — панель всегда в DOM
		await nextTick()

		return wrapper
	}

	it('без indicator обёртки нет', async () => {
		await renderSelect()

		expect(document.querySelectorAll('.s-select-item__indicator')).toHaveLength(0)
	})

	it('обёртка у каждой опции, иконка — у выбранной', async () => {
		await renderSelect({ indicator: 'start' })

		expect(document.querySelectorAll('.s-select-item__indicator')).toHaveLength(3)
		expect(document.querySelectorAll('.s-select-item__indicator svg')).toHaveLength(0)
		;(options()[1] as HTMLElement).click()
		await nextTick()

		expect(
			options().map((option) => !!option.querySelector('.s-select-item__indicator svg')),
		).toEqual([false, true, false])
	})

	it('end уносит отметку в конец строки', async () => {
		await renderSelect({ indicator: 'end' })
		;(options()[0] as HTMLElement).click()
		await nextTick()

		expect(sideOf(options()[0], '.s-select-item__indicator')).toBe('end')
	})

	it('отметка не попадает в дерево доступности', async () => {
		await renderSelect({ indicator: 'start' })

		expect(document.querySelector('.s-select-item__indicator')?.getAttribute('aria-hidden')).toBe(
			'true',
		)
	})
})
