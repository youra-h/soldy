import type { InjectionKey } from 'vue'
import type { ILocaleSource } from '@soldy-ui/plugins'

/**
 * Ключ локали поддерева: под ним `LocaleProvider` отдаёт детям свой источник,
 * а сборка компонента (`createVueAdapterContext`) берёт ближайший.
 */
export const LOCALE_KEY: InjectionKey<ILocaleSource> = Symbol('soldy:locale')
