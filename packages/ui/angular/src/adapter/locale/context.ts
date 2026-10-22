import { InjectionToken, inject } from '@angular/core'
import type { ILocaleSource, TLocaleSource } from '@soldy-ui/plugins'

/** Источник локали поддерева; пишет в него сам провайдер. */
export const LOCALE_SOURCE = new InjectionToken<TLocaleSource>('soldy:locale')

/** Источник ближайшего `LocaleProviderDirective`; зовётся в контексте инъекции. */
export function nearestLocale(): ILocaleSource | undefined {
	return inject(LOCALE_SOURCE, { optional: true }) ?? undefined
}
