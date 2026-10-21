/**
 * Pagination под Angular — проводка на настоящей разметке.
 *
 * Окно, текущую страницу и её связь со значением проверяет ядро, раскладку и
 * фокус — браузер (`playground/vue/browser/pagination.spec.ts`). Здесь важно,
 * что выходы доезжают туда, куда должны: окно — в список, наборы страницы —
 * на её кнопку и место, выключенность и имена — на стрелки, а нажатия на
 * настоящей разметке доходят до модели и возвращаются значением. Сценарии —
 * те же, что у Vue (`pagination.spec.ts`); `v-model` Vue здесь — вход `value`
 * с выходом `(soChangeValue)`. Серверную разметку проверяет
 * `collections.server.spec.ts`.
 *
 * Своё у Angular — петля по ключу места (`track cell.key`): записи окна новые
 * на каждую смену, а страница, оставшаяся на экране, — тот же узел, со своим
 * содержимым слота. И такт: смену состояния шаблон применяет на проверке
 * изменений.
 */

import { describe, it, expect } from 'vitest'
import { Component, signal } from '@angular/core'
import { TestBed, type ComponentFixture } from '@angular/core/testing'
import {
	TPagination,
	type TComponentSize,
	type TComponentVariant,
	type TPaginationPage,
	type TPaginationValue,
} from '@soldy-ui/core'
import { arEG, ruRU, type TLocale } from '@soldy-ui/plugins'
import * as angular from '@soldy-ui/angular'
import { LocaleProviderDirective, SlotDirective, TPaginationComponent } from '@soldy-ui/angular'
import { find, findIn, mountHost, nextFrame } from './mount'

/** Входы пагинации, которые задают сценарии, кроме значения. */
type TProps = {
	readonly total?: number
	readonly pages?: TPaginationPage[]
	readonly middleCount?: number
	readonly disabled?: boolean
	readonly size?: TComponentSize
	readonly variant?: TComponentVariant
	readonly aria_label?: string
}

/**
 * Пагинация со значением в сигнале: смена приходит выходом `(soChangeValue)` и
 * возвращается входом — как `v-model:value` у Vue.
 */
@Component({
	selector: 'probe-pagination',
	standalone: true,
	imports: [TPaginationComponent],
	template: `<nav
		so-pagination
		[value]="value()"
		[total]="props().total"
		[pages]="props().pages"
		[middleCount]="props().middleCount"
		[disabled]="props().disabled"
		[size]="props().size"
		[variant]="props().variant"
		[aria_label]="props().aria_label"
		(soChangeValue)="value.set($event.newValue)"
	></nav>`,
})
class PaginationHost {
	readonly value = signal<TPaginationValue | undefined>(undefined)
	readonly props = signal<TProps>({})
}

@Component({
	selector: 'probe-pagination-ctrl',
	standalone: true,
	imports: [TPaginationComponent],
	template: `<nav so-pagination [ctrl]="ctrl"></nav>`,
})
class CtrlHost {
	readonly ctrl = new TPagination({ total: 100 })
}

@Component({
	selector: 'probe-pagination-attrs',
	standalone: true,
	imports: [TPaginationComponent],
	template: `<nav so-pagination [total]="30" class="mine" aria-label="Своё"></nav>`,
})
class AttrsHost {}

@Component({
	selector: 'probe-pagination-item',
	standalone: true,
	imports: [TPaginationComponent, SlotDirective],
	template: `<nav so-pagination [total]="100" [value]="value()">
		<ng-template slot="item" let-item="item" let-text="text"
			><b class="so-test-page">{{ item.value }}:{{ text }}</b></ng-template
		>
	</nav>`,
})
class ItemHost {
	readonly value = signal(2)
}

@Component({
	selector: 'probe-pagination-icons',
	standalone: true,
	imports: [TPaginationComponent, SlotDirective],
	template: `<nav so-pagination [total]="30">
		<ng-template slot="prev-icon"><i class="so-test-prev"></i></ng-template>
		<ng-template slot="next-icon"><i class="so-test-next"></i></ng-template>
	</nav>`,
})
class IconsHost {}

@Component({
	selector: 'probe-pagination-locale',
	standalone: true,
	imports: [TPaginationComponent, LocaleProviderDirective],
	template: `<div so-locale-provider [locale]="locale()">
		<nav so-pagination [total]="200000" [value]="12345"></nav>
	</div>`,
})
class LocaleHost {
	readonly locale = signal<TLocale>(ruRU)
}

/** Все HTML-узлы по селектору в разметке фикстуры. */
function findAll(fixture: ComponentFixture<unknown>, selector: string): HTMLElement[] {
	const host: HTMLElement = fixture.nativeElement

	return [...host.querySelectorAll(selector)].filter(
		(node): node is HTMLElement => node instanceof HTMLElement,
	)
}

/**
 * Ряд строкой, как его видит пользователь: пропуск — «…», текущая — в
 * скобках. Текущую сверяет по обоим наборам: `aria-current` у кнопки — для
 * скринридера, `data-selected` у места — для темы.
 */
function row(fixture: ComponentFixture<unknown>): string {
	return findAll(fixture, '.so-pagination__list > li')
		.map((place) => {
			if (place.classList.contains('so-pagination__ellipsis')) return place.textContent

			const button = find(place, 'button', HTMLElement)
			const text = button.textContent?.trim() ?? ''
			const current = button.getAttribute('aria-current') === 'page'

			if (current !== (place.dataset['selected'] === 'true')) {
				throw new Error(`страница ${text}: наборы разошлись`)
			}

			return current ? `[${text}]` : text
		})
		.join(' ')
}

/** Кнопка страницы по её тексту. */
function page(fixture: ComponentFixture<unknown>, text: string): HTMLElement {
	const found = findAll(fixture, '.so-pagination-item > button').find(
		(button) => button.textContent?.trim() === text,
	)

	if (!found) throw new Error(`страницы «${text}» нет`)

	return found
}

/** Нажатие, как у пользователя, и проверка изменений после него. */
function click(fixture: ComponentFixture<unknown>, target: HTMLElement): void {
	target.click()
	fixture.detectChanges()
}

/** Пагинация со значением и входами сценария. */
function render(
	initial: TPaginationValue | undefined,
	props: TProps = {},
): ComponentFixture<PaginationHost> {
	const fixture = TestBed.createComponent(PaginationHost)

	fixture.componentInstance.value.set(initial)
	fixture.componentInstance.props.set(props)
	fixture.detectChanges()

	return fixture
}

/** Корень пагинации. */
const root = (fixture: ComponentFixture<unknown>) => findIn(fixture, '[so-pagination]', HTMLElement)

describe('разметка', () => {
	it('ряд: стрелки по краям, между ними — список страниц и пропусков', () => {
		const fixture = render(5, { total: 100 })
		const nav = root(fixture)

		expect(nav.localName).toBe('nav')
		expect(row(fixture)).toBe('1 … 4 [5] 6 … 10')
		expect([...nav.children].map((child) => child.localName)).toEqual([
			'button',
			'ol',
			'button',
		])
		expect(findIn(fixture, '.so-pagination__list', HTMLElement).localName).toBe('ol')
		expect(nav.firstElementChild?.classList.contains('so-pagination__prev')).toBe(true)
		expect(nav.firstElementChild?.classList.contains('so-button')).toBe(true)
		expect(nav.lastElementChild?.classList.contains('so-pagination__next')).toBe(true)
	})

	it('страница: li с data-*, кнопка с aria-current — только у текущей', () => {
		const fixture = render(5, { total: 100 })
		const current = page(fixture, '5')
		const place = current.parentElement

		expect(place?.localName).toBe('li')
		expect(place?.classList.contains('so-pagination-item')).toBe(true)
		expect(place?.dataset['selected']).toBe('true')
		expect(place?.hasAttribute('aria-current')).toBe(false)
		expect(current.getAttribute('type')).toBe('button')
		expect(current.getAttribute('aria-current')).toBe('page')
		// Текущая — обычная кнопка: своя остановка Tab
		expect(current.hasAttribute('disabled')).toBe(false)
		expect(findAll(fixture, '[aria-current]')).toHaveLength(1)
	})

	it('пропуск — многоточие текстом, без кнопки и остановки', () => {
		const fixture = render(5, { total: 100 })
		const gaps = findAll(fixture, '.so-pagination__ellipsis')

		expect(gaps.map((gap) => gap.localName)).toEqual(['li', 'li'])
		expect(gaps.map((gap) => gap.textContent)).toEqual(['…', '…'])
		expect(gaps.every((gap) => gap.children.length === 0)).toBe(true)
	})

	it('стрелки: имена от локали, type="button", без вида', () => {
		const fixture = render(5, { total: 100 })
		const prev = findIn(fixture, '.so-pagination__prev', HTMLElement)
		const next = findIn(fixture, '.so-pagination__next', HTMLElement)

		expect(prev.getAttribute('aria-label')).toBe('Previous page')
		expect(next.getAttribute('aria-label')).toBe('Next page')
		expect(prev.getAttribute('type')).toBe('button')
		expect(next.getAttribute('type')).toBe('button')
		expect(prev.querySelector('.so-icon')).not.toBeNull()
		expect(prev.className).not.toMatch(/--view-/)
	})

	it('имя ряду даёт приложение: aria_label на nav', () => {
		const fixture = render(undefined, { total: 100, aria_label: 'Страницы результатов' })

		expect(root(fixture).getAttribute('aria-label')).toBe('Страницы результатов')
	})

	it('размер и вариант — у стрелок и страниц', () => {
		const fixture = render(undefined, { total: 30, size: 'lg', variant: 'brand' })
		const buttons = findAll(fixture, '.so-pagination button')

		expect(buttons).toHaveLength(5)

		for (const button of buttons) {
			expect(button.classList.contains('so-button--size-lg')).toBe(true)
			expect(button.classList.contains('so-button--variant-brand')).toBe(true)
		}
	})

	/**
	 * Страница — внутренняя часть, как тост у Toasts: в разметку её не ставят,
	 * страницы окна кладёт в коллекцию сама пагинация.
	 */
	it('страница из пакета не выходит', () => {
		const exported: Record<string, unknown> = angular

		expect(Object.keys(exported).filter((name) => name.startsWith('TPaginationItem'))).toEqual(
			[],
		)
		expect(
			Object.keys(exported).filter((name) => name.startsWith('setupPaginationItem')),
		).toEqual([])
	})

	it('атрибуты потребителя — корню nav рядом с классом ядра', () => {
		const fixture = mountHost(AttrsHost)

		expect(root(fixture).classList.contains('mine')).toBe(true)
		expect(root(fixture).classList.contains('so-pagination')).toBe(true)
		expect(root(fixture).getAttribute('aria-label')).toBe('Своё')
	})
})

describe('нажатия → значение', () => {
	it('нажатие страницы — значение и окно вокруг неё', () => {
		const fixture = render(5, { total: 100 })

		click(fixture, page(fixture, '6'))

		expect(fixture.componentInstance.value()).toBe(6)
		expect(row(fixture)).toBe('1 … 5 [6] 7 … 10')

		click(fixture, page(fixture, '10'))

		expect(fixture.componentInstance.value()).toBe(10)
		expect(row(fixture)).toBe('1 … 6 7 8 9 [10]')
	})

	it('стрелки листают и гаснут на краях', () => {
		const fixture = render(1, { total: 30 })
		const prev = findIn(fixture, '.so-pagination__prev', HTMLElement)
		const next = findIn(fixture, '.so-pagination__next', HTMLElement)

		expect(prev.hasAttribute('disabled')).toBe(true)
		expect(next.hasAttribute('disabled')).toBe(false)

		click(fixture, next)

		expect(fixture.componentInstance.value()).toBe(2)
		expect(prev.hasAttribute('disabled')).toBe(false)

		click(fixture, next)

		expect(fixture.componentInstance.value()).toBe(3)
		expect(next.hasAttribute('disabled')).toBe(true)
		expect(row(fixture)).toBe('1 2 [3]')

		click(fixture, prev)

		expect(fixture.componentInstance.value()).toBe(2)
	})

	it('значение из модели — окно вокруг него', () => {
		const fixture = render(1, { total: 100 })

		fixture.componentInstance.value.set(7)
		fixture.detectChanges()

		expect(row(fixture)).toBe('1 … 6 [7] 8 9 10')
	})

	it('страница, оставшаяся на экране, — тот же узел, и фокус на ней остаётся', () => {
		const fixture = render(5, { total: 100 })
		const six = page(fixture, '6')
		const first = page(fixture, '1')

		six.focus()
		click(fixture, six)

		expect(page(fixture, '6')).toBe(six)
		expect(page(fixture, '1')).toBe(first)
		expect(document.activeElement).toBe(six)
	})

	it('свой ctrl: значение из кода — окно вокруг него', () => {
		const fixture = mountHost(CtrlHost)

		fixture.componentInstance.ctrl.value = 7
		fixture.detectChanges()

		expect(row(fixture)).toBe('1 … 6 [7] 8 9 10')
	})

	it('выключенная пагинация — выключены стрелки и страницы', () => {
		const fixture = render(5, { total: 100, disabled: true })
		const buttons = findAll(fixture, '.so-pagination button')

		expect(buttons.length).toBeGreaterThan(2)
		expect(buttons.every((button) => button.hasAttribute('disabled'))).toBe(true)
		expect(root(fixture).dataset['disabled']).toBe('true')
	})

	/**
	 * Стрелка, погасшая у края под фокусом, отдаёт его текущей странице
	 * (`TPaginationFocusPlugin`) — раньше, чем разметка выключит стрелку.
	 * Плагин находит корень по `ready` — кадром позже.
	 */
	it('стрелка погасла у края под фокусом — фокус на текущей странице', async () => {
		const fixture = render(2, { total: 30 })

		await nextFrame()

		const next = findIn(fixture, '.so-pagination__next', HTMLElement)

		next.focus()
		click(fixture, next)

		expect(next.hasAttribute('disabled')).toBe(true)
		expect(document.activeElement).toBe(page(fixture, '3'))
	})
})

describe('текст и слоты', () => {
	const PAGES = ['Админ', 'Записи', 'Конференция', 'Отчёты', 'Почта', 'Склад', 'Настройки']

	it('текстовые страницы — по порядку списка, value — ключ страницы', () => {
		// Середина 1: при середине 3 семь страниц видны все, и пропусков нет
		const fixture = render('reports', {
			pages: PAGES.map((text, index) => ({
				text,
				value: index === 3 ? 'reports' : undefined,
			})),
			middleCount: 1,
		})

		expect(row(fixture)).toBe('Админ … [Отчёты] … Настройки')

		click(fixture, page(fixture, 'Настройки'))

		// У страницы без своего ключа ключ — её номер
		expect(fixture.componentInstance.value()).toBe(7)
		expect(row(fixture)).toBe('Админ … Почта Склад [Настройки]')
	})

	it('слот item получает страницу и её текст', () => {
		const fixture = mountHost(ItemHost)

		expect(findAll(fixture, '.so-test-page').map((probe) => probe.textContent)).toEqual([
			'1:1',
			'2:2',
			'3:3',
			'4:4',
			'5:5',
			'10:10',
		])
		// Текущую отмечает кнопка, а слот — только её содержимое
		expect(
			findIn(fixture, '[aria-current="page"] .so-test-page', HTMLElement).textContent,
		).toBe('2:2')
	})

	it('слоты значков стрелок', () => {
		const fixture = mountHost(IconsHost)

		expect(findIn(fixture, '.so-pagination__prev .so-test-prev', HTMLElement)).toBeTruthy()
		expect(findIn(fixture, '.so-pagination__next .so-test-next', HTMLElement)).toBeTruthy()
		expect(findAll(fixture, '.so-pagination__prev .so-icon')).toEqual([])
	})

	/**
	 * Окно — новые записи на каждую смену. Петля по ссылке пересоздала бы все
	 * страницы и с ними содержимое их слотов; по ключу места страница,
	 * оставшаяся в окне, своё содержимое не пересобирает.
	 */
	it('смена окна не пересоздаёт содержимое слота у страниц, оставшихся на экране', () => {
		const fixture = mountHost(ItemHost)

		fixture.componentInstance.value.set(5)
		fixture.detectChanges()

		const before = new Map(
			findAll(fixture, '.so-test-page').map((probe) => [probe.textContent, probe]),
		)

		fixture.componentInstance.value.set(6)
		fixture.detectChanges()

		const after = findAll(fixture, '.so-test-page')

		// В окно вошла одна страница — 7; страницы 4 больше нет
		expect(after.filter((probe) => !before.has(probe.textContent))).toHaveLength(1)
		expect(
			after
				.filter((probe) => before.has(probe.textContent))
				.every((probe) => before.get(probe.textContent) === probe),
		).toBe(true)
	})
})

describe('локаль поддерева', () => {
	it('имена стрелок и цифры номеров — от провайдера, на лету', () => {
		const fixture = mountHost(LocaleHost)

		expect(
			findIn(fixture, '.so-pagination__prev', HTMLElement).getAttribute('aria-label'),
		).toBe('Предыдущая страница')
		expect(
			findIn(fixture, '.so-pagination__next', HTMLElement).getAttribute('aria-label'),
		).toBe('Следующая страница')

		const ru = new Intl.NumberFormat('ru-RU')

		expect(row(fixture)).toBe(
			['1', '…', ru.format(12_344), `[${ru.format(12_345)}]`, ru.format(12_346), '…'].join(
				' ',
			) + ` ${ru.format(20_000)}`,
		)

		const current = page(fixture, ru.format(12_345))

		fixture.componentInstance.locale.set(arEG)
		fixture.detectChanges()

		expect(
			findIn(fixture, '.so-pagination__prev', HTMLElement).getAttribute('aria-label'),
		).toBe(arEG.translations.pagination.prev)
		// Те же страницы, текст — в цифрах новой локали
		expect(page(fixture, '١٢٬٣٤٥')).toBe(current)
	})
})
