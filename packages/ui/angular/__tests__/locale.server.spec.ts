/**
 * Локаль поддерева на сервере: источник у каждого провайдера свой, а не у
 * процесса, и сервер, рисуя запросы на разных языках, их не смешивает.
 *
 * Строки библиотеки видно по имени кнопки очистки Input, а язык, с которым
 * собран компонент, — по плагину-зонду: тег локали он выносит в разметку
 * атрибутом `data-locale`. Язык данных — по формату поля даты и заголовку
 * месяца календаря. Язык запроса странице отдаёт провайдер запроса, как
 * данные запроса в приложении.
 */

import { describe, it, expect, afterEach } from 'vitest'
import { Component, InjectionToken, inject, type Type } from '@angular/core'
import { TButton } from '@soldy-ui/core'
import { TBasePlugin, enUS, ruRU, zhCN, type IPluginContext, type TLocale } from '@soldy-ui/plugins'
import { usePlugins } from '@soldy-ui/setup'
import {
	LocaleProviderDirective,
	TButtonComponent,
	TCalendarComponent,
	TDateInputComponent,
	TInputComponent,
} from '@soldy-ui/angular'
import { find } from './mount'
import { renderOnServer } from './server'

/** Язык запроса. */
const REQUEST_LOCALE = new InjectionToken<TLocale>('request-locale')

/** Плагин-зонд: тег локали, с которой собран компонент, — в его `data-locale`. */
class TLocaleTagPlugin extends TBasePlugin<TButton> {
	override install(ctx: IPluginContext, options?: unknown): void {
		super.install(ctx, options)

		ctx.getInstance<TButton>()?.dataset.add('locale', ctx.locale.locale.tag)
	}
}

@Component({
	selector: 'app-root',
	standalone: true,
	imports: [TButtonComponent, TInputComponent, LocaleProviderDirective],
	template: `<ng-container so-locale-provider [locale]="locale">
		<button so-button class="probe"></button>
		<div so-input clearable name="Город"></div>
	</ng-container>`,
})
class LocalePage {
	readonly locale = inject(REQUEST_LOCALE)
}

/** Поле даты под провайдером языка запроса. */
@Component({
	selector: 'app-date-root',
	standalone: true,
	imports: [TDateInputComponent, LocaleProviderDirective],
	template: `<ng-container so-locale-provider [locale]="locale">
		<div so-date-input></div>
	</ng-container>`,
})
class DateLocalePage {
	readonly locale = inject(REQUEST_LOCALE)
}

/** Календарь сентября 2026 под провайдером языка запроса. */
@Component({
	selector: 'app-calendar-root',
	standalone: true,
	imports: [TCalendarComponent, LocaleProviderDirective],
	template: `<ng-container so-locale-provider [locale]="locale">
		<div so-calendar [months]="months"></div>
	</ng-container>`,
})
class CalendarLocalePage {
	readonly locale = inject(REQUEST_LOCALE)
	readonly months = ['2026-09-01']
}

/** Страница `app`, которую сервер нарисовал на языке `locale`. */
function renderPage(locale: TLocale, app: Type<unknown> = LocalePage): Promise<string> {
	return renderOnServer(app, [{ provide: REQUEST_LOCALE, useValue: locale }])
}

/**
 * Страница сервера, разобранная документом. Разбирать — после всех рендеров:
 * пока идёт хоть один, классы DOM в `globalThis` — эмуляции сервера (см.
 * `server.ts`).
 */
const parse = (page: string) => new DOMParser().parseFromString(page, 'text/html')

/** Тег локали кнопки-зонда на странице. */
const pageLocale = (page: string) =>
	find(parse(page), '.probe', HTMLButtonElement).dataset['locale']

/** Имя кнопки очистки поля на странице. */
const clearName = (page: string) =>
	find(parse(page), '.so-input__clear', HTMLButtonElement).getAttribute('aria-label')

/** Ряд частей поля даты на странице. */
const row = (page: Document) => find(page, '.so-date-input__segments', HTMLElement)

/** Часть «день» поля даты на странице. */
const daySegment = (page: Document) =>
	find(page, '.so-date-input__segment[data-type="day"]', HTMLElement)

/** Имя части «день» на языке `tag` — так его называет поле. */
const dayName = (tag: string) =>
	new Intl.DisplayNames([tag, 'en-US'], { type: 'dateTimeField' }).of('day')

/** Заголовок сетки на странице. */
const monthOf = (page: Document) => find(page, '.so-calendar__title-text', HTMLElement).textContent

/** Имя кнопки «предыдущий месяц» на странице. */
const prevName = (page: Document) =>
	find(page, '.so-calendar__prev', HTMLButtonElement).getAttribute('aria-label')

/** Заголовок сетки сентября 2026 на языке `tag` — так его подписывает календарь. */
const monthTitle = (tag: string) =>
	new Intl.DateTimeFormat(tag, { month: 'long', year: 'numeric', timeZone: 'UTC' }).format(
		Date.UTC(2026, 8, 1),
	)

let dispose: (() => void) | undefined

afterEach(() => {
	dispose?.()
	dispose = undefined
})

describe('серверный рендер', () => {
	it('параллельные запросы на разных языках не смешиваются', async () => {
		dispose = usePlugins(TButton, [TLocaleTagPlugin])

		const pages = await Promise.all([renderPage(ruRU), renderPage(enUS), renderPage(zhCN)])

		expect(pages.map(pageLocale)).toEqual([ruRU.tag, enUS.tag, zhCN.tag])
	})

	it('имя кнопки очистки — на языке своего запроса', async () => {
		const pages = await Promise.all([renderPage(ruRU), renderPage(enUS), renderPage(zhCN)])

		expect(pages.map(clearName)).toEqual(['Очистить Город', 'Clear Город', '清除Город'])
	})

	it('поле даты: язык, подсказки и имена частей — своего запроса', async () => {
		const pages = await Promise.all(
			[ruRU, enUS, zhCN].map((locale) => renderPage(locale, DateLocalePage)),
		)
		const [ru, en, zh] = pages.map(parse)

		if (!ru || !en || !zh) throw new Error('страниц не три')

		expect(row(ru).getAttribute('lang')).toBe('ru-RU')
		expect(daySegment(ru).getAttribute('aria-label')).toBe(dayName('ru-RU'))
		expect(daySegment(ru).textContent).toBe('дд')
		expect(row(en).getAttribute('lang')).toBe('en-US')
		expect(daySegment(en).getAttribute('aria-label')).toBe(dayName('en-US'))
		expect(daySegment(en).textContent).not.toBe('дд')
		expect(row(zh).getAttribute('lang')).toBe('zh-CN')
		expect(daySegment(zh).getAttribute('aria-label')).toBe(dayName('zh-CN'))
	})

	it('календарь: заголовок месяца и имена кнопок листания — своего запроса', async () => {
		const pages = await Promise.all(
			[ruRU, enUS, zhCN].map((locale) => renderPage(locale, CalendarLocalePage)),
		)
		const [ru, en, zh] = pages.map(parse)

		if (!ru || !en || !zh) throw new Error('страниц не три')

		expect(monthOf(ru)).toBe(monthTitle('ru-RU'))
		expect(prevName(ru)).toBe('Предыдущий месяц')
		expect(monthOf(en)).toBe(monthTitle('en-US'))
		expect(prevName(en)).toBe('Previous month')
		expect(monthOf(zh)).toBe(monthTitle('zh-CN'))
		expect(prevName(zh)).toBe('上个月')
	})
})
