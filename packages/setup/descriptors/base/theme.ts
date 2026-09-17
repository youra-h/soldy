/**
 * Тема как набор регистраций: плагины и расширения коллекций, без которых её
 * CSS не работает.
 *
 *   // @soldy/theme-oren/setup
 *   export default defineTheme({
 *     name: 'oren',
 *     plugins: [{ type: TTabs, plugins: [TTabsViewPlugin] }],
 *   })
 *
 *   // точка входа приложения
 *   useTheme(oren)
 *
 * Тема отдаёт CSS и `index.d.ts` (значения оформления), а то, что пишет для её
 * CSS данные в разметку, — плагины — отдаёт этим объектом. Явным экспортом, а
 * не раскладкой файлов по соглашению: сборщик не обходит файлы чужого пакета, и
 * забытый файл не молчал бы, а просто не подключился.
 *
 * `useTheme` — те же `usePlugins`/`useExtensions`, одним вызовом. Умолчание
 * `scope` у темы — `'all'`: тема рисует компонент и там, где он деталь чужой
 * разметки (Tags в поле Select).
 */

import type { IPluginRegistrationOptions, TRegisteredPlugin } from './plugin-registry'
import { usePlugins } from './plugin-registry'
import type { TExtensionFactory } from './extension-registry'
import { useExtensions } from './extension-registry'

type TComponentType = abstract new (...args: any[]) => object

/** Плагины темы на тип компонента. */
export interface IThemePlugins extends IPluginRegistrationOptions {
	readonly type: TComponentType
	readonly plugins: readonly TRegisteredPlugin[]
}

/** Расширения коллекции темы на тип владельца. */
export interface IThemeExtensions extends IPluginRegistrationOptions {
	readonly type: TComponentType
	readonly extensions: readonly TExtensionFactory[]
}

export interface ITheme {
	/** Имя темы — для сообщений и отладки. */
	readonly name: string
	readonly plugins?: readonly IThemePlugins[]
	readonly extensions?: readonly IThemeExtensions[]
}

/** Объявить тему. Ничего не регистрирует: подключает её `useTheme`. */
export function defineTheme<T extends ITheme>(theme: T): T {
	return theme
}

/**
 * Подключить тему: зарегистрировать её плагины и расширения. Возвращает
 * отмену всех регистраций темы.
 */
export function useTheme(theme: ITheme): () => void {
	const disposers = [
		...(theme.plugins ?? []).map(({ type, plugins, scope }) =>
			usePlugins(type, plugins, { scope: scope ?? 'all' }),
		),
		...(theme.extensions ?? []).map(({ type, extensions, scope }) =>
			useExtensions(type, extensions, { scope: scope ?? 'all' }),
		),
	]

	return () => {
		for (const dispose of disposers) dispose()
	}
}
