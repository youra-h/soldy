/**
 * Контракты реестра: что приложение регистрирует на тип компонента и с какими опциями.
 */

import type { IExtension } from '@soldy/core'
import type { IPluginConstructor } from '@soldy/plugins'
import type { IBundleContext } from '../define'

/**
 * Тип компонента — класс ядра. Сравнение через `instanceof`: объект
 * дескриптора строится заново на каждом монтировании, а класс один.
 */
export type TComponentType = abstract new (...args: any[]) => object

/** Какие компоненты типа получают плагин. */
export type TPluginScope = 'own' | 'all'

export interface IPluginRegistrationOptions {
	/**
	 * `'own'` — только компоненты, которые поставил пользователь; `'all'` — и
	 * вложенные в разметку других компонентов.
	 */
	scope?: TPluginScope
}

/** Регистрация: записи реестра на тип компонента. */
export interface IRegistration<TEntry> {
	readonly type: TComponentType
	readonly entries: readonly TEntry[]
	readonly scope: TPluginScope
}

/** Список регистраций одного реестра. */
export interface IRegistrations<TEntry> {
	/** Зарегистрировать записи на тип; возвращает отмену регистрации. */
	add(
		type: TComponentType,
		entries: readonly TEntry[],
		options: IPluginRegistrationOptions,
	): () => void
	/** Записи регистраций, подходящих компоненту, в порядке регистрации. */
	select(instance: object, context: IBundleContext): TEntry[]
}

/**
 * Плагин регистрации: класс, класс с опциями установки или определение
 * `definePlugin` (у него те же `ctor` и `options`).
 *
 * Поверхность компонента определение не меняет: её объявляет только
 * дескриптор. Определение нужно ради импорта — он держит в бандле модуль, где
 * записан контракт плагина (см. `registry/plugins.ts`).
 */
export type TRegisteredPlugin =
	| IPluginConstructor<any, any, any>
	| { readonly ctor: IPluginConstructor<any, any, any>; readonly options?: object }

/** Плагин, который компонент получает из реестра. */
export interface IResolvedPlugin {
	readonly ctor: IPluginConstructor<any, any, any>
	readonly options?: object
}

/** Фабрика расширения: владелец коллекции → расширение для его движка. */
export type TExtensionFactory<TOwner extends object = any> = (owner: TOwner) => IExtension<any>

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
