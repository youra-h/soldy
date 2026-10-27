/**
 * Контракт контекста адаптера, его опций и конструкторов расширений.
 */

import type { TEvented } from '@soldy-ui/core'
import type { ILocaleSource, IPluginBundle } from '@soldy-ui/plugins'
import type { IComponentContract, IComponentDescriptor, IPluginsContract } from '../../define'
import type { IAdapterProfile } from '../../naming'
import type { TExchange } from '../exchange/exchange.class'
import type { TMember } from '../exchange/member.class'

/**
 * The context's life: `attach` — the framework accepted the assembled
 * component, `detach` — it began removing it, `destroy` — it let it go. Each
 * comes once and in this order; the adapter's runtime sends `attach` and
 * `destroy`, `detach` comes from the runtime too or from the collection the
 * component is an item of (`TCollectionItemExtension`). What to do on
 * `detach` is the adapter's call: the consumer hears nothing from then on.
 */
export type TAdapterEvents = {
	attach: () => void
	detach: () => void
	destroy: () => void
}

/**
 * Контракт контекста: инстанс и плагины названы, остальное — как у любого
 * компонента. По нему `createAdapterContext` сводит инстанс из двух
 * источников — `ctor` дескриптора и переданного `ctrl`.
 */
export type TContextContract<
	TInstance extends object,
	TPlugins extends IPluginsContract = IPluginsContract,
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
	/**
	 * Id монтирования — от `useId` фреймворка, один на сервере и в браузере.
	 * Уходит своему набору плагинов: от него плагины строят `id` частей
	 * (`IPluginBundle.createId`). Инстанс его не получает — `id` нужны документу,
	 * а не ядру. Набор не свой (`config.bundle`) — id монтирования у того, кто
	 * его собрал.
	 */
	mountId?: string
	/**
	 * Локаль поддерева — от провайдера локали фреймворка, ближайшего выше по
	 * дереву: тег для Intl и строки библиотеки, с событием смены. Уходит своему
	 * набору плагинов, как id монтирования (`IPluginBundle.locale`): по ней
	 * плагины языка и имён пишут компоненту тег и имена кнопок — при сборке и
	 * на каждую смену. Инстанс её не получает: язык знает место компонента в
	 * дереве, а не экземпляр. Не задана — у набора своя английская. Набор не
	 * свой (`config.bundle`) — локаль у того, кто его собрал.
	 */
	locale?: ILocaleSource
}

/** Что свой набор берёт от монтирования: id монтирования и локаль поддерева. */
export type TBundleMount = Pick<IAdapterContextOptions, 'mountId' | 'locale'>

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
	readonly descriptor: IComponentDescriptor
	/**
	 * Пропсы сборки — до первого `connect()`: их читают расширения в
	 * конструкторе, а обмен заводит из них память входов. После `connect()` —
	 * `undefined`: память входов живёт своими ячейками, и контекст пропсы
	 * отпускает.
	 */
	readonly props: object | undefined
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
	 * Обмен значениями с фреймворком в именах его профиля: состояние, входы,
	 * события. Память входов начинается с пропсов сборки; начальные значения уже
	 * применила сборка.
	 *
	 * Обмен один на монтирование: первый вызов его заводит и отпускает пропсы
	 * сборки, повторный с тем же профилем отдаёт его же, с другим — ошибка.
	 */
	connect(profile: IAdapterProfile): TExchange

	/**
	 * Фреймворк принял собранный компонент: с этого момента он часть живого
	 * дерева, а не черновик сборки. Пара к `destroy()`: обе зовёт рантайм
	 * адаптера в свой момент цикла, а не компонент. Сборка чужого не трогает —
	 * то, что пишет в чужое хранилище (вход элемента в коллекцию владельца),
	 * подписывается на `attach`. Зовётся один раз, между сборкой и
	 * `destroy()`: порядок держит рантайм адаптера, как и у `destroy()`.
	 */
	attach(): void

	/**
	 * The framework began removing the component: the first moment of its
	 * teardown, before its children go. The context reports it (`detach`
	 * event) and nothing else — the adapter stops the consumer on it. A
	 * collection reports it to its items as well
	 * (`TCollectionItemExtension`): siblings leave one by one, and an item still
	 * heard would hear them go. Once: a repeat does nothing.
	 */
	detach(): void

	/** Destroy the context; detached first, if it was not. */
	destroy(): void
}

/**
 * Владение набором плагинов: свой (`TOwnBundle`) или не свой (`TSharedBundle`).
 *
 * «Свой набор или чужой» — не флаг, который проверяет каждый, кто с набором
 * работает: всё, что от этого зависит, делает один из двух объектов.
 */
export interface IBundleTenancy {
	readonly bundle: IPluginBundle | null
	/**
	 * Участники обмена от набора: плагины дескриптора, а у своего набора — ещё и
	 * связка. Строятся на вызов: нужны они сборке и обмену, а не набору, и набор
	 * их не держит.
	 */
	members(): readonly TMember[]
	/** Кому из участников набора (`members()`) эта сборка пишет начальные значения. */
	seeded(members: readonly TMember[]): readonly TMember[]
	/** Завершить сборку после начальных значений: плагины реестра и объявление набора наружу. */
	complete(): void
	destroy(): void
}
