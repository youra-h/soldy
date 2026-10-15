import { defineComponent, provide, watch } from 'vue'
import { TLocaleSource } from '@soldy-ui/plugins'
import type { TLocale } from '@soldy-ui/plugins'
import { useExpose, type TClosedComponent } from '../static'
import { LOCALE_KEY } from './key'

/** Пропсы провайдера: локаль поддерева. */
export type LocaleProviderProps = {
	/** Локаль поддерева: тег для Intl и строки библиотеки (`ruRU`, `extendLocale(...)`) */
	locale: TLocale
}

/**
 * Объектом опций, а не функцией `setup`: опции `expose` форма с функцией не
 * принимает, а она у провайдера та же, что у компонентов (`useExpose`). Тип
 * пропсов — аргументом `defineComponent`: опция `props` — список имён, и тип
 * из неё был бы `any`.
 */
const LocaleProviderComponent = defineComponent<LocaleProviderProps>({
	name: 'LocaleProvider',
	props: ['locale'],
	expose: useExpose(),
	setup(props, { slots }) {
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
})

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
 * рисует он только содержимое. Экземпляр снаружи закрыт, как у компонентов.
 */
export const LocaleProvider: TClosedComponent<typeof LocaleProviderComponent> =
	LocaleProviderComponent
