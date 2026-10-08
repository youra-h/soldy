import { createContext } from 'react'
import type { ILocaleSource } from '@soldy-ui/plugins'

/**
 * Локаль поддерева: под ним `LocaleProvider` отдаёт детям свой источник, а
 * сборка компонента (`useAdapterContext`) берёт ближайший. Вне провайдера —
 * `undefined`, и у набора своя английская.
 */
export const LocaleContext = createContext<ILocaleSource | undefined>(undefined)
