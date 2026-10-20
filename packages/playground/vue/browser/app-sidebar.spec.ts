/**
 * Меню страницы свойств в настоящем браузере: без рамки, и кольцо фокуса
 * списка видно целиком.
 *
 * Рамка нужна ListBox как самостоятельному виджету, а в колонке оболочки она
 * лишняя: её снимает правило `.pg__menu` оболочки поверх темы, тема рамку
 * сохраняет. Кольцо фокуса — контур узла списка, а не рамка корня: без рамки
 * оно остаётся и не срезается краем прокручиваемой колонки меню.
 *
 * Состав меню — один список с группами реестра — сторожит
 * `__tests__/navigation.spec.ts`, раскладку подписи и разделителя групп
 * ListBox — `list-groups.spec.ts`.
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { render, cleanup } from 'vitest-browser-vue'
import { userEvent } from 'vitest/browser'
import { defineComponent, h } from 'vue'
import { ListBox } from '@soldy-ui/vue'
import { router } from '../src/router'
import AppSidebar from '../src/components/AppSidebar.vue'
import { expectRingInsideHorizontally } from './focus-ring'

import '@soldy-ui/theme-oren'
import '../src/styles.css'

const nextFrame = () => new Promise<void>((resolve) => requestAnimationFrame(() => resolve()))

/** Узел по селектору; нет его — тест падает здесь, а не на чтении свойства. */
const find = (selector: string): HTMLElement => {
	const element = document.querySelector(selector)

	if (!(element instanceof HTMLElement)) throw new Error(`${selector}: HTML-узла нет`)

	return element
}

/** Толщина рамки по четырём сторонам. */
const borderOf = (element: Element): string[] => {
	const style = getComputedStyle(element)

	return [
		style.borderTopWidth,
		style.borderRightWidth,
		style.borderBottomWidth,
		style.borderLeftWidth,
	]
}

beforeEach(async () => {
	await router.push('/vue/button')
	await router.isReady()

	render(AppSidebar, { global: { plugins: [router] } })
	await nextFrame()
})

afterEach(() => {
	cleanup()
})

describe('меню страницы свойств', () => {
	it('рамки у меню нет, а у ListBox вне оболочки — есть', async () => {
		render(
			defineComponent({
				render: () => h(ListBox, { class: 'plain', items: [{ value: 'a', text: 'Один' }] }),
			}),
		)
		await nextFrame()

		// Рамка темы на месте — значит, снимает её именно правило оболочки
		expect(borderOf(find('.so-list-box.plain'))).toEqual(['1px', '1px', '1px', '1px'])
		expect(borderOf(find('.pg__menu'))).toEqual(['0px', '0px', '0px', '0px'])
	})

	it('кольцо фокуса с клавиатуры — у узла списка, целиком в колонке меню', async () => {
		// Перед списком в колонке одна остановка Tab — ссылка «Витрина»
		find('.pg__sidebar a').focus()
		await userEvent.keyboard('{Tab}')

		const list = find('.pg__menu .so-list-box__list')

		expect(document.activeElement).toBe(list)
		expect(list.matches(':focus-visible')).toBe(true)

		expectRingInsideHorizontally(list, find('.pg__sidebar'), 'список меню')
	})
})
