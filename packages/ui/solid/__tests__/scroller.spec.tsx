/**
 * Scroller в Solid — проводка на настоящей разметке.
 *
 * Модель проверяет ядро, счёт краёв — тест плагина, раскладку и листание —
 * `playground/vue/browser/scroller.spec.ts`: в jsdom у вьюпорта нет ни
 * ширины, ни прокрутки. Здесь важно, что состав, состояния и наборы доезжают
 * туда, куда должны: `data-*` на корень, роль потребителя и `tabindex` — на
 * вьюпорт, выключенность и имена — на кнопки. Сценарии — те же, что у Vue
 * (`scroller.spec.ts`).
 */

import { describe, it, expect } from 'vitest'
import { createSignal, type JSX } from 'solid-js'
import { TScroller } from '@soldy-ui/core'
import { enUS, extendLocale, ruRU } from '@soldy-ui/plugins'
import { LocaleProvider, Scroller } from '@soldy-ui/solid'
import { find, mount, nextFrame } from './mount'

/** Корень ленты в документе. */
const root = () => find(document, '.so-scroller', HTMLElement)

/** Вьюпорт ленты в документе. */
const viewport = () => find(document, '.so-scroller__viewport', HTMLElement)

/** Узел по селектору в документе. */
const node = (selector: string) => find(document, selector, HTMLElement)

/** Содержимое ленты — произвольная разметка: коллекции у неё нет. */
const content = (): JSX.Element => <span class="so-test-item">Первый</span>

/** Смонтировать и дождаться кадра: корень плагины получают через `requestAnimationFrame`. */
async function render(code: () => JSX.Element): Promise<void> {
	mount(code)
	await nextFrame()
}

describe('состав', () => {
	it('корень — ряд из кнопки, вьюпорта и кнопки, в этом порядке', async () => {
		await render(() => <Scroller>{content()}</Scroller>)

		expect([...root().children].map((child) => child.className)).toEqual([
			'so-button so-button--size-normal so-scroller__prev',
			'so-scroller__viewport',
			'so-button so-button--size-normal so-scroller__next',
		])
	})

	it('содержимое лежит прямо во вьюпорте — обёртки между ними нет', async () => {
		await render(() => <Scroller>{content()}</Scroller>)

		expect(viewport().children[0]?.className).toBe('so-test-item')
	})

	it('кнопки — type="button", значок по умолчанию — иконка, вида нет', async () => {
		await render(() => <Scroller>{content()}</Scroller>)

		for (const button of [node('.so-scroller__prev'), node('.so-scroller__next')]) {
			expect(button.getAttribute('type')).toBe('button')
			expect(button.querySelector('.so-icon')).not.toBeNull()
			expect(button.className).not.toMatch(/--view-/)
		}
	})

	it('значок кнопки переопределяется своим слотом', async () => {
		await render(() => (
			<Scroller prev-icon={<i class="so-test-prev" />} next-icon={<i class="so-test-next" />}>
				{content()}
			</Scroller>
		))

		expect(node('.so-scroller__prev .so-test-prev')).toBeTruthy()
		expect(node('.so-scroller__next .so-test-next')).toBeTruthy()
		expect(document.querySelector('.so-scroller__prev .so-icon')).toBeNull()
	})

	it('размер — у кнопок и их значков', async () => {
		await render(() => <Scroller size="lg">{content()}</Scroller>)

		// Корень иконки по роли — `<svg>`
		const icon = find(document, '.so-scroller__next .so-icon', SVGElement)

		expect(node('.so-scroller__prev').classList.contains('so-button--size-lg')).toBe(true)
		expect(icon.classList.contains('so-icon--size-lg')).toBe(true)
	})
})

describe('состояние на корне', () => {
	it('оба признака стоят с первой отрисовки', async () => {
		await render(() => <Scroller>{content()}</Scroller>)

		expect(root().dataset.canPrev).toBe('false')
		expect(root().dataset.canNext).toBe('false')
	})

	/**
	 * Замер идёт из плагина, а здесь мерить нечего: в jsdom у вьюпорта нули.
	 * Поэтому факт приносит инстанс — та же вторая поверхность управления.
	 */
	it('замер доезжает до темы и до кнопок', async () => {
		const ctrl = new TScroller()

		await render(() => <Scroller ctrl={ctrl}>{content()}</Scroller>)

		ctrl.notifyViewport({ canPrev: false, canNext: true, hasTabStops: false })

		expect(root().dataset.canPrev).toBe('false')
		expect(root().dataset.canNext).toBe('true')
		expect(node('.so-scroller__prev').hasAttribute('disabled')).toBe(true)
		expect(node('.so-scroller__next').hasAttribute('disabled')).toBe(false)
	})

	it('выключенная лента гасит обе кнопки', async () => {
		const ctrl = new TScroller({ disabled: true })

		await render(() => <Scroller ctrl={ctrl}>{content()}</Scroller>)

		ctrl.notifyViewport({ canPrev: true, canNext: true, hasTabStops: false })

		expect(node('.so-scroller__prev').hasAttribute('disabled')).toBe(true)
		expect(node('.so-scroller__next').hasAttribute('disabled')).toBe(true)
	})

	it('ленту включили — кнопки за краями, а не за выключенностью', async () => {
		const [disabled, setDisabled] = createSignal(true)
		const ctrl = new TScroller()

		await render(() => (
			<Scroller ctrl={ctrl} disabled={disabled()}>
				{content()}
			</Scroller>
		))

		ctrl.notifyViewport({ canPrev: true, canNext: false, hasTabStops: false })
		setDisabled(false)

		expect(node('.so-scroller__prev').hasAttribute('disabled')).toBe(false)
		expect(node('.so-scroller__next').hasAttribute('disabled')).toBe(true)
	})
})

describe('вьюпорт', () => {
	it('роль ряда приходит от потребителя и стоит на вьюпорте, а не на корне', async () => {
		await render(() => <Scroller viewportAria={{ role: 'listbox' }}>{content()}</Scroller>)

		expect(viewport().getAttribute('role')).toBe('listbox')
		expect(root().hasAttribute('role')).toBe(false)
	})

	it('становится остановкой Tab, когда листать есть куда, а своих остановок нет', async () => {
		const ctrl = new TScroller()

		await render(() => <Scroller ctrl={ctrl}>{content()}</Scroller>)

		expect(viewport().hasAttribute('tabindex')).toBe(false)

		ctrl.notifyViewport({ canPrev: false, canNext: true, hasTabStops: false })

		expect(viewport().getAttribute('tabindex')).toBe('0')
	})

	it('свои остановки внутри снимают остановку с самой ленты', async () => {
		const ctrl = new TScroller()

		await render(() => <Scroller ctrl={ctrl}>{content()}</Scroller>)

		ctrl.notifyViewport({ canPrev: false, canNext: true, hasTabStops: true })

		expect(viewport().hasAttribute('tabindex')).toBe(false)
	})

	/** Ряд с roving tabindex сам решает, кому быть остановкой: его значение сильнее. */
	it('tabindex от потребителя сильнее нашего', async () => {
		const ctrl = new TScroller()

		await render(() => (
			<Scroller ctrl={ctrl} viewportAria={{ tabindex: '-1' }}>
				{content()}
			</Scroller>
		))

		ctrl.notifyViewport({ canPrev: false, canNext: true, hasTabStops: false })

		expect(viewport().getAttribute('tabindex')).toBe('-1')
	})
})

describe('имена кнопок', () => {
	it('приходят от локали поддерева и обновляются вместе с ней', async () => {
		const [locale, setLocale] = createSignal(ruRU)

		await render(() => (
			<LocaleProvider locale={locale()}>
				<Scroller>{content()}</Scroller>
			</LocaleProvider>
		))

		expect(node('.so-scroller__prev').getAttribute('aria-label')).toBe('Прокрутить назад')
		expect(node('.so-scroller__next').getAttribute('aria-label')).toBe('Прокрутить вперёд')

		setLocale(extendLocale(enUS, { translations: { scroller: { prev: 'К началу' } } }))

		expect(node('.so-scroller__prev').getAttribute('aria-label')).toBe('К началу')
	})
})
