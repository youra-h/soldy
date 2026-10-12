/**
 * Локаль поддерева в контексте места: `<so-locale-provider>` отдаёт свой
 * источник своему элементу, а сборка компонента (`createWebcAdapterContext`)
 * берёт ближайший вверх от хоста.
 *
 * Контекст наружу не выходит: читают и пишут его только эти две функции. Вне
 * провайдера источника нет, и у набора своя английская.
 */

import type { ILocaleSource } from '@soldy-ui/plugins'
import { TPlaceContext } from '../context'

const LOCALE = new TPlaceContext<ILocaleSource>()

/** Отдать источник локали всему, что стоит ниже провайдера. */
export function provideLocale(provider: Element, source: ILocaleSource): void {
	LOCALE.provide(provider, source)
}

/**
 * Источник ближайшего `<so-locale-provider>` выше узла; провайдера нет —
 * `undefined`. Зовётся при сборке, когда элемент подключён: место у
 * отключённого элемента — только его собственное поддерево.
 */
export function nearestLocale(node: Node): ILocaleSource | undefined {
	return LOCALE.nearest(node)
}
