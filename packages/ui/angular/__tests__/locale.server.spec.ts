/**
 * Локаль поддерева на сервере: источник у каждого провайдера свой, а не у
 * процесса, и сервер, рисуя запросы на разных языках, их не смешивает.
 *
 * Компонентов со строками у Angular пока нет, поэтому язык, с которым собран
 * компонент, в разметку выносит плагин-зонд — тегом локали в `data-locale`.
 * Язык запроса странице отдаёт провайдер запроса, как данные запроса в
 * приложении.
 */

import { describe, it, expect, afterEach } from 'vitest'
import { Component, InjectionToken, inject } from '@angular/core'
import { TButton } from '@soldy-ui/core'
import { TBasePlugin, enUS, ruRU, zhCN, type IPluginContext, type TLocale } from '@soldy-ui/plugins'
import { usePlugins } from '@soldy-ui/setup'
import { LocaleProviderDirective, TButtonComponent } from '@soldy-ui/angular'
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
	imports: [TButtonComponent, LocaleProviderDirective],
	template: `<ng-container so-locale-provider [locale]="locale">
		<button so-button></button>
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
 * Тег локали кнопки на странице. Разбирать страницу — после всех рендеров:
 * пока идёт хоть один, классы DOM в `globalThis` — эмуляции сервера (см.
 * `server.ts`).
 */
function pageLocale(page: string): string | undefined {
	const document = new DOMParser().parseFromString(page, 'text/html')

	return find(document, '[so-button]', HTMLButtonElement).dataset['locale']
}

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
})
