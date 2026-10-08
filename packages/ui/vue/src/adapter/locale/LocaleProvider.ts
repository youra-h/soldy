import { defineComponent, provide, watch } from 'vue'
import { TLocaleSource } from '@soldy-ui/plugins'
import type { TLocale } from '@soldy-ui/plugins'
import { LOCALE_KEY } from './key'

/** Пропсы провайдера: локаль поддерева. */
export type LocaleProviderProps = {
	/** Локаль поддерева: тег для Intl и строки библиотеки (`ruRU`, `extendLocale(...)`) */
	locale: TLocale
}

/**
 * LocaleProvider — локаль поддерева: язык и строки библиотеки компонентам
 * внутри.
 *
 * ```vue
 * <LocaleProvider :locale="current">
 * 	<RouterView />
 * </LocaleProvider>
 * ```
 *
 * Источник локали (`TLocaleSource`) у провайдера свой: он создаётся с
 * провайдером и уходит детям через `provide`, а сборка каждого компонента
 * отдаёт его набору плагинов. Сменили проп — провайдер пишет новую локаль в
 * источник, и плагины языка и имён переписывают компонентам тег и имена на
 * лету, без перемонтирования. Источник один на провайдер, а не на процесс:
 * сервер рисует параллельные запросы каждый на своём языке, а вложенный
 * провайдер даёт поддереву свой. Без провайдера компоненты — на английском.
 *
 * Провайдер — механизм фреймворка (`provide`, `watch`), поэтому он в
 * адаптерном слое, а не среди компонентов. Своей разметки у него нет:
 * рисует он только содержимое.
 */
export const LocaleProvider = defineComponent(
	(props: LocaleProviderProps, { slots }) => {
		const source = new TLocaleSource(props.locale)

		provide(LOCALE_KEY, source)

		watch(
			() => props.locale,
			(locale) => {
				source.locale = locale
			},
		)

		return () => slots.default?.()
	},
	{ name: 'LocaleProvider', props: ['locale'] },
)
