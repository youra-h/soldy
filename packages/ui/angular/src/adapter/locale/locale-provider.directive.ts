import { Directive, Input, inject } from '@angular/core'
import { TLocaleSource, enUS } from '@soldy-ui/plugins'
import type { TLocale } from '@soldy-ui/plugins'
import { LOCALE_SOURCE } from './context'

/**
 * Локаль поддерева: `<ng-container so-locale-provider [locale]="current()">`.
 * Источник свой у каждого провайдера — сервер рисует запросы на разных языках.
 * AGENTS.md (Angular), «Локаль поддерева — `LocaleProviderDirective`».
 */
@Directive({
	selector: '[so-locale-provider]',
	standalone: true,
	providers: [{ provide: LOCALE_SOURCE, useFactory: () => new TLocaleSource(enUS) }],
})
export class LocaleProviderDirective {
	private readonly _source = inject(LOCALE_SOURCE, { self: true })

	// Сеттер: вход директивы Angular пишет раньше `ngOnInit` детей, где они
	// собираются, а смена — в тот же источник, без пересборки
	@Input({ required: true })
	set locale(value: TLocale) {
		this._source.locale = value
	}

	get locale(): TLocale {
		return this._source.locale
	}
}
