/**
 * Локаль поддерева на сервере: источник у каждого провайдера свой, а не у
 * процесса, и сервер, рисуя запросы на разных языках, их не смешивает.
 *
 * Строки библиотеки видно по имени кнопки очистки Input, а язык, с которым
 * собран компонент, — по плагину-зонду: тег локали он выносит в разметку
 * атрибутом `data-locale`. Язык запроса странице отдаёт провайдер запроса,
 * как данные запроса в приложении.
 */

import { describe, it, expect, afterEach } from 'vitest'
import { Component, InjectionToken, inject } from '@angular/core'
import { TButton } from '@soldy-ui/core'
import { TBasePlugin, enUS, ruRU, zhCN, type IPluginContext, type TLocale } from '@soldy-ui/plugins'
import { usePlugins } from '@soldy-ui/setup'
import { LocaleProviderDirective, TButtonComponent, TInputComponent } from '@soldy-ui/angular'
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

/** Страница, которую сервер нарисовал на языке `locale`. */
function renderPage(locale: TLocale): Promise<string> {
	return renderOnServer(LocalePage, [{ provide: REQUEST_LOCALE, useValue: locale }])
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
})
