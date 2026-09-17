/**
 * Контракты реестра: что приложение регистрирует на тип компонента и с какими опциями.
 */

import type { IExtension } from '@soldy/core'
import type { IPropDeclaration, TName } from '@soldy/accessor'
import type { IPluginConstructor } from '@soldy/plugins'
import type { IBundleContext, IPluginDefinition } from '../define'

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
 * `definePlugin`. Только у определения есть пропсы и события — наружу
 * компонента они выходят так же, как у плагинов дескриптора (`timer_interval`,
 * `@timer:tick`).
 */
export type TRegisteredPlugin =
	| IPluginConstructor<any, any, any>
	| { readonly ctor: IPluginConstructor<any, any, any>; readonly options?: object }
	| IPluginDefinition

/** Плагин, который компонент получает из реестра. */
export interface IResolvedPlugin {
	readonly ctor: IPluginConstructor<any, any, any>
	readonly options?: object
	/** Пропсы определения (`definePlugin`); у класса без определения их нет. */
	readonly props?: readonly IPropDeclaration[]
	readonly events?: readonly TName[]
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
