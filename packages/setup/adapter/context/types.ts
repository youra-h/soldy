/**
 * Контракт контекста адаптера, его опций и конструкторов расширений.
 */

import type { TEvented } from '@soldy/core'
import type { TAccessor } from '@soldy/accessor'
import type { IPluginBundle } from '@soldy/plugins'
import type { IComponentContract, IComponentDescriptor, IPluginContract } from '../../define'

export type TAdapterEvents = {
	destroy: () => void
}

/**
 * Контракт контекста: инстанс и плагины названы, остальное — как у любого
 * компонента. По нему `createAdapterContext` сводит инстанс из двух
 * источников — `ctor` дескриптора и переданного `ctrl`.
 */
export type TContextContract<
	TInstance extends object,
	TPlugins extends IPluginContract = IPluginContract,
> = IComponentContract & { instance: TInstance; plugins: TPlugins }

/**
 * Контекст компонента, про который известен только инстанс. Так расширение
 * объявляет, с чем оно работает: `TInstanceContext<TCollectionOwner>` — с
 * любым компонентом, у инстанса которого есть `engine`.
 */
export type TInstanceContext<TInstance extends object> = IAdapterContext<
	TContextContract<TInstance>
>

/**
 * Конструктор расширения с опциями.
 *
 * `TInstance` — какой инстанс нужен расширению (`TCollectionExtension` —
 * фасад с `engine`). `IAdapterContext.use()` сверяет его с инстансом контекста
 * при компиляции: расширение не подключить к компоненту, у которого нет того,
 * с чем оно работает.
 */
export interface IAdapterExtensionCtor<
	T = unknown,
	TOpts = unknown,
	TInstance extends object = object,
> {
	new (context: TInstanceContext<TInstance>, options: TOpts): T
}

/** Конструктор расширения без опций. */
export interface IAdapterExtensionCtorNoOpts<T = unknown, TInstance extends object = object> {
	new (context: TInstanceContext<TInstance>): T
}

/** Любой конструктор расширения — ключ реестра и элемент стартового набора. */
export type TAnyExtensionCtor = new (...args: any[]) => unknown

/** Опции создания адаптер-контекста: готовый инстанс (ctrl) или props/options конструктора. */
export interface IAdapterContextOptions<TInstance extends object = object> {
	ctrl?: TInstance
	/**
	 * Пропсы фреймворка. `object`, а не `Record<string, unknown>`: адаптеры
	 * объявляют пропсы интерфейсами, у которых нет индексной сигнатуры. Читаются
	 * по имени из дескриптора — через `Reflect.get`.
	 */
	props?: object
	options?: object
	/**
	 * Имя места, если компонент — деталь разметки другого компонента (строка и
	 * крестик тега). Уходит в состав монтирования (`resolveComposition`): плагины
	 * реестра со `scope: 'own'` вложенному компоненту не ставятся.
	 */
	embedded?: string
}

export interface IAdapterContextConfig {
	/**
	 * Готовый набор плагинов: его передаёт тот, кто его собрал (адаптер
	 * коллекции делит набор компонента с фасадом). Без него набор собирается по
	 * составу — плагины дескриптора плюс регистрации приложения.
	 */
	bundle?: IPluginBundle | null
}

/**
 * Контекст адаптера: собранный компонент и его расширения.
 *
 * Параметр — контракт дескриптора, по которому контекст собран
 * (`IComponentContract`). Его выводит `createAdapterContext`, а `useAdapter`
 * адаптеров берёт из него тип инстанса и выходы плагинов для типа состояния
 * (`TAdapterState`) — дженерики в компоненте не пишут.
 */
export interface IAdapterContext<C extends IComponentContract = IComponentContract> {
	/** Фантомное поле: в рантайме его нет, оно только несёт контракт в типе. */
	readonly __contract?: C
	readonly instance: C['instance']
	readonly bundle: IPluginBundle | null
	readonly accessor: TAccessor
	readonly descriptor: IComponentDescriptor
	readonly props: object
	/** Имя места, если компонент — деталь чужой разметки (`IAdapterContextOptions.embedded`). */
	readonly embedded: string | undefined
	readonly events: TEvented<TAdapterEvents>

	/** Подключить расширение БЕЗ опций */
	use<T>(ExtensionCtor: IAdapterExtensionCtorNoOpts<T, C['instance']>): this
	/** Подключить расширение С обязательными опциями */
	use<T, TOpts>(
		ExtensionCtor: IAdapterExtensionCtor<T, TOpts, C['instance']>,
		options: TOpts,
	): this

	/** Получить зарегистрированное расширение по его классу */
	get<T>(ctor: new (...args: any[]) => T): T | undefined

	/**
	 * Связать корневой узел разметки с `TElementPlugin` набора; `null` —
	 * отвязать. У компонента без этого плагина вызов ничего не делает.
	 */
	bindElement(element: Element | null): void

	/**
	 * Значения пропсов плагинов, поставленных снаружи (`pluginProps`):
	 * `{ timer_ms: 500 }`. Ключ пропал — проп возвращается к умолчанию
	 * декларации; плагина ещё нет — значение ждёт его установки. Зовёт связка;
	 * у контекста на чужом наборе (фасад коллекции) вызов ничего не делает —
	 * набор ведёт его владелец.
	 */
	writePluginProps(values: unknown): void

	/** Запустить уничтожение контекста */
	destroy(): void
}
