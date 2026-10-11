import { Directive, Input, inject } from '@angular/core'
import { TLocaleSource, enUS } from '@soldy-ui/plugins'
import type { TLocale } from '@soldy-ui/plugins'
import { LOCALE_SOURCE } from './context'

/**
 * LocaleProviderDirective — локаль поддерева: язык и строки библиотеки
 * компонентам внутри.
 *
 * ```html
 * <ng-container so-locale-provider [locale]="current()">
 * 	<router-outlet />
 * </ng-container>
 * ```
 *
 * Источник локали (`TLocaleSource`) у директивы свой: он уходит поддереву
 * через её `providers`, а сборка каждого компонента берёт ближайший и отдаёт
 * его набору плагинов. Источник один на провайдер, а не на процесс: сервер
 * рисует параллельные запросы каждый на своём языке, а вложенный провайдер
 * даёт поддереву свой. Без провайдера компоненты — на английском.
 *
 * Своей разметки у директивы нет, поэтому её можно ставить и на
 * `<ng-container>`: DI Angular идёт по дереву шаблона, и провайдер контейнера
 * видят все узлы внутри него.
 *
 * Вход пишется прямо в источник, сеттером: Angular записывает вход директивы
 * раньше, чем вызывает `ngOnInit` у детей, а дети собираются в `ngOnInit`
 * (`TComponentBase`) — поэтому компоненты, собранные в том же проходе, видят
 * уже локаль из входа. Английская, с которой источник создан, — только место
 * под неё до первой записи: вход обязателен. Смена входа — в тот же источник:
 * плагины языка и имён переписывают компонентам тег и имена, а компоненты не
 * пересобираются.
 *
 * Провайдер — механизм фреймворка (DI), поэтому он в адаптерном слое, а не
 * среди компонентов.
 *
 * Selector: [so-locale-provider]
 */
@Directive({
	selector: '[so-locale-provider]',
	standalone: true,
	providers: [{ provide: LOCALE_SOURCE, useFactory: () => new TLocaleSource(enUS) }],
})
export class LocaleProviderDirective {
	/** Свой источник — из своих же `providers`, а не ближайший выше. */
	private readonly _source = inject(LOCALE_SOURCE, { self: true })

	/** Локаль поддерева: тег для Intl и строки библиотеки (`ruRU`, `extendLocale(...)`). */
	@Input({ required: true })
	set locale(value: TLocale) {
		this._source.locale = value
	}

	get locale(): TLocale {
		return this._source.locale
	}
}
