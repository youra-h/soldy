/**
 * Локаль поддерева в контексте Solid: `LocaleProvider` отдаёт детям свой
 * источник (`LocaleContext.Provider`), а сборка компонента
 * (`createSolidAdapterContext`) берёт ближайший (`useContext`).
 *
 * Контекст наружу не выходит: читают и пишут его только провайдер и эта
 * функция. Вне провайдера источника нет, и у набора своя английская.
 */

import { createContext, useContext } from 'solid-js'
import type { ILocaleSource } from '@soldy-ui/plugins'

export const LocaleContext = createContext<ILocaleSource | undefined>(undefined)

/**
 * Источник ближайшего `LocaleProvider` выше по дереву; провайдера нет —
 * `undefined`. Зовётся при сборке компонента: контекст Solid читается во
 * время выполнения его тела, когда у реактивного владельца есть место в
 * дереве.
 */
export function nearestLocale(): ILocaleSource | undefined {
	return useContext(LocaleContext)
}
