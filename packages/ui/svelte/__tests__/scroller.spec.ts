/**
 * Scroller в Svelte — проводка на настоящей разметке.
 *
 * Модель проверяет ядро, счёт краёв — тест плагина, раскладку и листание —
 * `playground/vue/browser/scroller.spec.ts`: в jsdom у вьюпорта нет ни
 * ширины, ни прокрутки. Здесь важно, что состав, состояния и наборы доезжают
 * туда, куда должны: `data-*` на корень, роль потребителя и `tabindex` — на
 * вьюпорт, выключенность и имена — на кнопки. Сценарии — те же, что у Vue
 * (`scroller.spec.ts`).
 */

import { describe, it, expect } from 'vitest'
import { flushSync } from 'svelte'
import { TScroller } from '@soldy-ui/core'
import { enUS, extendLocale, ruRU } from '@soldy-ui/plugins'
import { Scroller, type ScrollerProps } from '@soldy-ui/svelte'
import Surround from './Surround.test.svelte'
import { find, mount, nextFrame } from './mount'
import { reactiveProps } from './reactive-props.svelte'
import { markup } from './snippets.svelte'

/** Содержимое ленты — произвольная разметка: коллекции у неё нет. */
const content = () => markup('<span class="so-test-item">Первый</span>')

/** Смонтировать и дождаться кадра: корень плагины получают через `requestAnimationFrame`. */
async function render(props: ScrollerProps = {}): Promise<void> {
	mount(Scroller, { children: content(), ...props })
	await nextFrame()
}

const node = (selector: string) => find(document, selector, HTMLElement)
const root = () => node('.so-scroller')
const viewport = () => node('.so-scroller__viewport')

describe('состав', () => {
	it('корень — ряд из кнопки, вьюпорта и кнопки, в этом порядке', async () => {
		await render()

		expect([...root().children].map((element) => element.className)).toEqual([
			'so-button so-button--size-normal so-scroller__prev',
			'so-scroller__viewport',
			'so-button so-button--size-normal so-scroller__next',
		])
	})

	it('кнопки — type="button", со значком роли по умолчанию', async () => {
		await render()

		for (const button of [node('.so-scroller__prev'), node('.so-scroller__next')]) {
			expect(button.localName).toBe('button')
			expect(button.getAttribute('type')).toBe('button')
			expect(button.querySelector('svg.so-icon')).not.toBeNull()
		}
	})

	it('содержимое лежит прямо во вьюпорте — обёртки между ними нет', async () => {
		await render()

		expect(viewport().children[0]?.className).toBe('so-test-item')
	})

	it('значок кнопки переопределяется своим слотом', async () => {
		await render({
			'prev-icon': markup('<i class="so-test-prev"></i>'),
			'next-icon': markup('<i class="so-test-next"></i>'),
		})

		expect(node('.so-scroller__prev .so-test-prev')).toBeTruthy()
		expect(node('.so-scroller__next .so-test-next')).toBeTruthy()
		expect(document.querySelector('.so-scroller__prev .so-icon')).toBeNull()
	})

	it('размер ленты — у кнопок и их значков', async () => {
		await render({ size: 'lg' })

		const icon = find(document, '.so-scroller__next .so-icon', SVGElement)

		expect(node('.so-scroller__prev').classList.contains('so-button--size-lg')).toBe(true)
		expect(icon.classList.contains('so-icon--size-lg')).toBe(true)
	})
})

describe('состояние на корне', () => {
	it('оба признака стоят с первой отрисовки', async () => {
		await render()

		expect(root().dataset.canPrev).toBe('false')
		expect(root().dataset.canNext).toBe('false')
	})

	/**
	 * Замер идёт из плагина, а здесь мерить нечего: в jsdom у вьюпорта нули.
	 * Поэтому факт приносит инстанс — та же вторая поверхность управления.
	 */
	it('замер доезжает до темы и до кнопок', async () => {
		const ctrl = new TScroller()

		await render({ ctrl })

		ctrl.notifyViewport({ canPrev: false, canNext: true, hasTabStops: false })
		flushSync()

		expect(root().dataset.canPrev).toBe('false')
		expect(root().dataset.canNext).toBe('true')
		expect(node('.so-scroller__prev').hasAttribute('disabled')).toBe(true)
		expect(node('.so-scroller__next').hasAttribute('disabled')).toBe(false)
	})

	it('выключенная лента гасит обе кнопки', async () => {
		const ctrl = new TScroller({ disabled: true })

		await render({ ctrl })

		ctrl.notifyViewport({ canPrev: true, canNext: true, hasTabStops: false })
		flushSync()

		expect(node('.so-scroller__prev').hasAttribute('disabled')).toBe(true)
		expect(node('.so-scroller__next').hasAttribute('disabled')).toBe(true)
	})
})

describe('вьюпорт', () => {
	it('роль ряда приходит от потребителя и стоит на вьюпорте, а не на корне', async () => {
		await render({ viewportAria: { role: 'listbox' } })

		expect(viewport().getAttribute('role')).toBe('listbox')
		expect(root().hasAttribute('role')).toBe(false)
	})

	it('становится остановкой Tab, когда листать есть куда, а своих остановок нет', async () => {
		const ctrl = new TScroller()

		await render({ ctrl })

		expect(viewport().hasAttribute('tabindex')).toBe(false)

		ctrl.notifyViewport({ canPrev: false, canNext: true, hasTabStops: false })
		flushSync()

		expect(viewport().getAttribute('tabindex')).toBe('0')
	})

	it('свои остановки внутри снимают остановку с самой ленты', async () => {
		const ctrl = new TScroller()

		await render({ ctrl })

		ctrl.notifyViewport({ canPrev: false, canNext: true, hasTabStops: true })
		flushSync()

		expect(viewport().hasAttribute('tabindex')).toBe(false)
	})

	/** Ряд с roving tabindex сам решает, кому быть остановкой: его значение сильнее. */
	it('tabindex от потребителя сильнее нашего', async () => {
		const ctrl = new TScroller()

		await render({ ctrl, viewportAria: { tabindex: '-1' } })

		ctrl.notifyViewport({ canPrev: false, canNext: true, hasTabStops: false })
		flushSync()

		expect(viewport().getAttribute('tabindex')).toBe('-1')
	})

	it('набор потребителя сменился — вьюпорт за ним', async () => {
		const props = reactiveProps<ScrollerProps>({
			children: content(),
			viewportAria: { role: 'listbox' },
		})

		mount(Scroller, props)

		props.viewportAria = { role: 'list' }
		flushSync()

		expect(viewport().getAttribute('role')).toBe('list')
	})
})

describe('имена кнопок', () => {
	it('приходят от локали поддерева и обновляются вместе с ней', () => {
		const props = reactiveProps({
			around: 'locale' as const,
			control: 'scroller' as const,
			locale: ruRU,
		})

		mount(Surround, props)

		expect(node('.so-scroller__prev').getAttribute('aria-label')).toBe('Прокрутить назад')
		expect(node('.so-scroller__next').getAttribute('aria-label')).toBe('Прокрутить вперёд')

		const prev = node('.so-scroller__prev')

		props.locale = extendLocale(enUS, { translations: { scroller: { prev: 'К началу' } } })
		flushSync()

		expect(node('.so-scroller__prev')).toBe(prev)
		expect(prev.getAttribute('aria-label')).toBe('К началу')
	})
})
