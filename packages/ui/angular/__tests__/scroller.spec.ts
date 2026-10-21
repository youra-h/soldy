/**
 * Scroller под Angular — проводка на настоящей разметке.
 *
 * Модель проверяет ядро, счёт краёв — тест плагина, раскладку и листание —
 * `playground/vue/browser/scroller.spec.ts`: в jsdom у вьюпорта нет ни
 * ширины, ни прокрутки. Здесь важно, что состав, состояния и наборы доезжают
 * туда, куда должны: `data-*` на корень, роль потребителя и `tabindex` — на
 * вьюпорт, выключенность и имена — на кнопки. Сценарии — те же, что у Vue
 * (`scroller.spec.ts`).
 *
 * Своё у Angular — разметка: корень — элемент компонента (`<div so-scroller>`),
 * содержимое — основная проекция во вьюпорт, значки кнопок — шаблоны слотов
 * (`<ng-template slot="prev-icon">`), а их якоря уходят в слив, а не во
 * вьюпорт.
 */

import { describe, it, expect } from 'vitest'
import { Component, signal } from '@angular/core'
import { TScroller } from '@soldy-ui/core'
import { enUS, extendLocale, ruRU, type TLocale } from '@soldy-ui/plugins'
import type { TAttributesMap } from '@soldy-ui/core'
import { LocaleProviderDirective, SlotDirective, TScrollerComponent } from '@soldy-ui/angular'
import { find, findIn, mountHost, nextFrame } from './mount'

@Component({
	selector: 'probe-scroller',
	standalone: true,
	imports: [TScrollerComponent],
	template: `<div
		so-scroller
		[ctrl]="ctrl"
		[size]="size()"
		[disabled]="disabled()"
		[viewportAria]="viewportAria()"
	>
		<span class="so-test-item">Первый</span>
	</div>`,
})
class ScrollerHost {
	readonly ctrl = new TScroller()
	readonly size = signal<'normal' | 'lg'>('normal')
	readonly disabled = signal(false)
	readonly viewportAria = signal<TAttributesMap | undefined>(undefined)
}

@Component({
	selector: 'probe-scroller-icons',
	standalone: true,
	imports: [TScrollerComponent, SlotDirective],
	template: `<div so-scroller>
		<span class="so-test-item">Первый</span>
		<ng-template slot="prev-icon"><i class="so-test-prev"></i></ng-template>
		<ng-template slot="next-icon"><i class="so-test-next"></i></ng-template>
	</div>`,
})
class IconsHost {}

@Component({
	selector: 'probe-scroller-locale',
	standalone: true,
	imports: [TScrollerComponent, LocaleProviderDirective],
	template: `<div so-locale-provider [locale]="locale()">
		<div so-scroller><span>Первый</span></div>
	</div>`,
})
class LocaleHost {
	readonly locale = signal<TLocale>(ruRU)
}

/** Смонтировать и дождаться кадра: корень плагины получают через `requestAnimationFrame`. */
async function render<T>(host: new () => T) {
	const fixture = mountHost(host)

	await nextFrame()

	return fixture
}

describe('состав', () => {
	it('корень — ряд из кнопки, вьюпорта и кнопки, в этом порядке', async () => {
		const fixture = await render(ScrollerHost)
		const root = findIn(fixture, '[so-scroller]', HTMLElement)

		expect(root.localName).toBe('div')
		expect([...root.children].map((child) => child.className)).toEqual([
			'so-scroller__prev so-button so-button--size-normal',
			'so-scroller__viewport',
			'so-scroller__next so-button so-button--size-normal',
		])
	})

	it('содержимое лежит прямо во вьюпорте — обёртки между ними нет', async () => {
		const fixture = await render(ScrollerHost)
		const viewport = findIn(fixture, '.so-scroller__viewport', HTMLElement)

		expect([...viewport.children].map((child) => child.className)).toEqual(['so-test-item'])
	})

	it('кнопки — type="button", значок по умолчанию — иконка, вида нет', async () => {
		const fixture = await render(ScrollerHost)

		for (const selector of ['.so-scroller__prev', '.so-scroller__next']) {
			const button = findIn(fixture, selector, HTMLElement)

			expect(button.localName).toBe('button')
			expect(button.getAttribute('type')).toBe('button')
			expect(button.querySelector('.so-icon')).not.toBeNull()
			expect(button.className).not.toMatch(/--view-/)
		}
	})

	/**
	 * Шаблон слота — тоже содержимое: в основной проекции его якорь лёг бы во
	 * вьюпорт, среди элементов ленты, поэтому он уходит в слив.
	 */
	it('значок кнопки переопределяется шаблоном слота, а вьюпорт держит только содержимое', async () => {
		const fixture = await render(IconsHost)
		const viewport = findIn(fixture, '.so-scroller__viewport', HTMLElement)

		expect(findIn(fixture, '.so-scroller__prev .so-test-prev', HTMLElement)).toBeTruthy()
		expect(findIn(fixture, '.so-scroller__next .so-test-next', HTMLElement)).toBeTruthy()
		expect(fixture.nativeElement.querySelector('.so-scroller__prev .so-icon')).toBeNull()
		expect([...viewport.childNodes].map((child) => child.nodeType)).toEqual([Node.ELEMENT_NODE])
	})

	it('размер — у кнопок и их значков', async () => {
		const fixture = await render(ScrollerHost)

		fixture.componentInstance.size.set('lg')
		fixture.detectChanges()

		// Корень иконки по роли — `<svg>`
		const icon = findIn(fixture, '.so-scroller__next .so-icon', SVGElement)

		expect(
			findIn(fixture, '.so-scroller__prev', HTMLElement).classList.contains(
				'so-button--size-lg',
			),
		).toBe(true)
		expect(icon.classList.contains('so-icon--size-lg')).toBe(true)
	})
})

describe('состояние на корне', () => {
	it('оба признака стоят с первой отрисовки', async () => {
		const fixture = await render(ScrollerHost)
		const root = findIn(fixture, '[so-scroller]', HTMLElement)

		expect(root.dataset['canPrev']).toBe('false')
		expect(root.dataset['canNext']).toBe('false')
	})

	/**
	 * Замер идёт из плагина, а здесь мерить нечего: в jsdom у вьюпорта нули.
	 * Поэтому факт приносит инстанс — та же вторая поверхность управления.
	 */
	it('замер доезжает до темы и до кнопок', async () => {
		const fixture = await render(ScrollerHost)
		const root = findIn(fixture, '[so-scroller]', HTMLElement)

		fixture.componentInstance.ctrl.notifyViewport({
			canPrev: false,
			canNext: true,
			hasTabStops: false,
		})
		fixture.detectChanges()

		expect(root.dataset['canPrev']).toBe('false')
		expect(root.dataset['canNext']).toBe('true')
		expect(findIn(fixture, '.so-scroller__prev', HTMLElement).hasAttribute('disabled')).toBe(
			true,
		)
		expect(findIn(fixture, '.so-scroller__next', HTMLElement).hasAttribute('disabled')).toBe(
			false,
		)
	})

	it('выключенная лента гасит обе кнопки', async () => {
		const fixture = await render(ScrollerHost)

		fixture.componentInstance.disabled.set(true)
		fixture.componentInstance.ctrl.notifyViewport({
			canPrev: true,
			canNext: true,
			hasTabStops: false,
		})
		fixture.detectChanges()

		expect(findIn(fixture, '.so-scroller__prev', HTMLElement).hasAttribute('disabled')).toBe(
			true,
		)
		expect(findIn(fixture, '.so-scroller__next', HTMLElement).hasAttribute('disabled')).toBe(
			true,
		)
	})

	it('ленту включили — кнопки за краями, а не за выключенностью', async () => {
		const fixture = await render(ScrollerHost)

		fixture.componentInstance.disabled.set(true)
		fixture.detectChanges()

		fixture.componentInstance.ctrl.notifyViewport({
			canPrev: true,
			canNext: false,
			hasTabStops: false,
		})
		fixture.componentInstance.disabled.set(false)
		fixture.detectChanges()

		expect(findIn(fixture, '.so-scroller__prev', HTMLElement).hasAttribute('disabled')).toBe(
			false,
		)
		expect(findIn(fixture, '.so-scroller__next', HTMLElement).hasAttribute('disabled')).toBe(
			true,
		)
	})
})

describe('вьюпорт', () => {
	it('роль ряда приходит от потребителя и стоит на вьюпорте, а не на корне', async () => {
		const fixture = await render(ScrollerHost)

		fixture.componentInstance.viewportAria.set({ role: 'listbox' })
		fixture.detectChanges()

		expect(findIn(fixture, '.so-scroller__viewport', HTMLElement).getAttribute('role')).toBe(
			'listbox',
		)
		expect(findIn(fixture, '[so-scroller]', HTMLElement).hasAttribute('role')).toBe(false)
	})

	it('становится остановкой Tab, когда листать есть куда, а своих остановок нет', async () => {
		const fixture = await render(ScrollerHost)
		const viewport = findIn(fixture, '.so-scroller__viewport', HTMLElement)

		expect(viewport.hasAttribute('tabindex')).toBe(false)

		fixture.componentInstance.ctrl.notifyViewport({
			canPrev: false,
			canNext: true,
			hasTabStops: false,
		})
		fixture.detectChanges()

		expect(viewport.getAttribute('tabindex')).toBe('0')
	})

	it('свои остановки внутри снимают остановку с самой ленты', async () => {
		const fixture = await render(ScrollerHost)
		const viewport = findIn(fixture, '.so-scroller__viewport', HTMLElement)

		fixture.componentInstance.ctrl.notifyViewport({
			canPrev: false,
			canNext: true,
			hasTabStops: false,
		})
		fixture.detectChanges()

		fixture.componentInstance.ctrl.notifyViewport({
			canPrev: false,
			canNext: true,
			hasTabStops: true,
		})
		fixture.detectChanges()

		expect(viewport.hasAttribute('tabindex')).toBe(false)
	})

	/** Ряд с roving tabindex сам решает, кому быть остановкой: его значение сильнее. */
	it('tabindex от потребителя сильнее нашего', async () => {
		const fixture = await render(ScrollerHost)

		fixture.componentInstance.viewportAria.set({ tabindex: '-1' })
		fixture.componentInstance.ctrl.notifyViewport({
			canPrev: false,
			canNext: true,
			hasTabStops: false,
		})
		fixture.detectChanges()

		expect(
			findIn(fixture, '.so-scroller__viewport', HTMLElement).getAttribute('tabindex'),
		).toBe('-1')
	})
})

describe('имена кнопок', () => {
	it('приходят от локали поддерева и обновляются вместе с ней', async () => {
		const fixture = await render(LocaleHost)
		const host: HTMLElement = fixture.nativeElement
		const prev = find(host, '.so-scroller__prev', HTMLElement)
		const next = find(host, '.so-scroller__next', HTMLElement)

		expect(prev.getAttribute('aria-label')).toBe('Прокрутить назад')
		expect(next.getAttribute('aria-label')).toBe('Прокрутить вперёд')

		fixture.componentInstance.locale.set(
			extendLocale(enUS, { translations: { scroller: { prev: 'К началу' } } }),
		)
		fixture.detectChanges()

		expect(prev.getAttribute('aria-label')).toBe('К началу')
	})
})
