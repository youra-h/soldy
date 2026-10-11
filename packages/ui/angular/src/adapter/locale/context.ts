/**
 * Локаль поддерева в DI Angular: `LocaleProviderDirective` отдаёт свой
 * источник поддереву через `providers`, а сборка компонента
 * (`createAngularAdapterContext`) берёт ближайший (`inject`).
 *
 * Токен наружу не выходит: читают и пишут его только провайдер и эта
 * функция. Вне провайдера источника нет, и у набора своя английская.
 *
 * Тип токена — сам `TLocaleSource`, а не интерфейс только для чтения
 * (`ILocaleSource`): провайдер пишет в источник, который сам и отдал.
 */

import { InjectionToken, inject } from '@angular/core'
import type { ILocaleSource, TLocaleSource } from '@soldy-ui/plugins'

export const LOCALE_SOURCE = new InjectionToken<TLocaleSource>('soldy:locale')

/**
 * Источник ближайшего `LocaleProviderDirective` выше по дереву; провайдера
 * нет — `undefined`. Зовётся в контексте инъекции компонента — его даёт
 * сборке база (`TComponentBase`, `runInInjectionContext`): DI Angular
 * разрешает `inject` только там.
 */
export function nearestLocale(): ILocaleSource | undefined {
	return inject(LOCALE_SOURCE, { optional: true }) ?? undefined
}
