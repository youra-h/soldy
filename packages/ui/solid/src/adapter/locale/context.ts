import { createContext, useContext } from 'solid-js'
import type { ILocaleSource } from '@soldy-ui/plugins'

export const LocaleContext = createContext<ILocaleSource | undefined>(undefined)

/** Источник ближайшего `LocaleProvider`; нет его — у набора своя английская. */
export function nearestLocale(): ILocaleSource | undefined {
	return useContext(LocaleContext)
}
