/**
 * Контракты связывания: профиль фреймворка, поверхность компонента и связка на монтирование.
 */

import type { INamingStrategy, TName } from '@soldy/accessor'

/**
 * Как фреймворк называет публичную поверхность компонента. Один объект на
 * адаптер, константой модуля: по нему кэшируется поверхность.
 */
export interface IAdapterProfile {
	/** Имена пропов и событий: `aria_label`, `onElementReady`, `elementReady`. */
	readonly naming: INamingStrategy
	/**
	 * Имя слота по умолчанию во фреймворке — у тех, кто спредит несъеденные
	 * пропсы в корень: `children` у React, Solid и Svelte.
	 */
	readonly defaultSlot?: string
}

/** Триггер свойства: как его слушать на шине владельца и как он зовётся наружу. */
export interface ISurfaceTrigger {
	/** Имя на шине владельца: `change:visible`. */
	readonly raw: string
	/** Имя во фреймворке: `change:visible`, `onChangeVisible`, `changeVisible`. */
	readonly exportName: string
}

/** Свойство компонента в именах фреймворка. */
export interface ISurfaceProp {
	/** Полное имя (`aria:label`) — ключ свойства в аксессоре. */
	readonly key: string
	readonly name: TName
	/** Имя пропа во фреймворке: `aria_label`. */
	readonly exportName: string
	/** Свойство вычисляет владелец: снаружи его только читают. */
	readonly protected: boolean
	readonly triggers: readonly ISurfaceTrigger[]
}

/** Явное событие компонента в именах фреймворка. */
export interface ISurfaceEvent {
	/** Полное имя (`element:ready`) — ключ события в аксессоре. */
	readonly key: string
	/** Имя на шине владельца: `ready`. */
	readonly raw: string
	readonly exportName: string
}

/** Проп для статического слоя фреймворка: тип и умолчание. */
export type TSurfacePropConfig = { type?: unknown; default?: unknown }

/**
 * Публичная поверхность компонента в именах одного фреймворка.
 *
 * Свойство типа, а не монтирования: внешний плагин контракт не расширяет
 * (AGENTS.md, «Внешний плагин не расширяет контракт компонента»), поэтому
 * поверхность считается один раз на пару «дескриптор × профиль».
 */
export interface ISurface {
	/** Свойства компонента и плагинов дескриптора, protected включительно. */
	readonly props: readonly ISurfaceProp[]
	/** Свойства, которые пишутся снаружи. */
	readonly inputs: readonly ISurfaceProp[]
	readonly events: readonly ISurfaceEvent[]
	/**
	 * Пропсы для статического объявления (Vue `props`, `observedAttributes`,
	 * inputs Angular): без protected. `default` есть, только если его объявила
	 * декларация — значим ключ, а не значение (см. `IPropDeclaration.default`).
	 */
	readonly exportProps: Readonly<Record<string, TSurfacePropConfig>>
	/** События для статического объявления: явные и триггеры свойств, без повторов. */
	readonly exportEvents: readonly string[]
	/**
	 * Имена, которые компонент съедает сам: пропы и их триггеры, события,
	 * слоты, `ctrl` и `embedded`. Остальное адаптер спредит в корень.
	 */
	readonly consumed: ReadonlySet<string>
}

/** Запись значения из ядра во фреймворк: свойство и его свежее значение. */
export type TOutputWriter = (prop: ISurfaceProp, value: unknown) => void

/** Проброс события ядра наружу: имя во фреймворке и аргументы события. */
export type TEventEmitter = (exportName: string, args: readonly unknown[]) => void

/**
 * Связка компонента с фреймворком на одно монтирование.
 *
 * Всё, что у шести адаптеров совпадает, живёт здесь: подписки на триггеры,
 * дедупликация событий, чтение пропсов по двум именам, guard от записи того же
 * значения. Адаптеру остаётся сказать, куда писать значение и как отдать
 * событие, и решить, в какой момент своего цикла это делать.
 */
export interface IComponentBinding {
	readonly surface: ISurface
	/** Стартовые значения свойств с триггерами: имя во фреймворке → значение. */
	state(): Record<string, unknown>
	/** Ядро → фреймворк: подписка на триггеры свойств. Возвращает отписку. */
	bindOutput(write: TOutputWriter): () => void
	/** Ядро → фреймворк: события, без повторов по источнику. Возвращает отписку. */
	bindEvents(emit: TEventEmitter): () => void
	/** Значение свойства в пропсах фреймворка: по имени во фреймворке, затем по сырому. */
	read(prop: ISurfaceProp, props: object): unknown
	/**
	 * Фреймворк → ядро, одно свойство. `undefined`, protected и то же значение
	 * пропускаются: сеттер, эмитящий и на том же значении, замкнул бы цикл
	 * через колбэки событий.
	 */
	write(prop: ISurfaceProp, value: unknown): void
	/** Фреймворк → ядро, все входные свойства из пропсов разом. */
	writeAll(props: object): void
	/** Пропсы, которые компонент не съел, — для спреда в корень. */
	forward<TProps extends object>(props: TProps): Partial<TProps>
}
