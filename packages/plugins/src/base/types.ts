import type { TEvented } from '@soldy/core'
import type { PLUGIN_EVENTS } from './events'

/**
 * Контекст, передаваемый плагину при установке.
 */
export interface IPluginContext {
	get<P extends IPlugin<any, any>>(ctor: IPluginConstructor<any, any, P>): P | undefined
	getInstance<T>(): T | null
}

export type TPluginEvents = {
	install: (ctx: IPluginContext, options?: unknown) => void
	/**
	 * Плагин уничтожается. Без аргументов, как и сам `destroy()`: контекста
	 * при уничтожении у плагина нет.
	 */
	destroy: () => void
	/**
	 * Плагин создан и доступен снаружи. Эмитится adapter-слоем — не в install,
	 * потому что на момент установки подписчиков ещё нет: bundle собирается
	 * раньше, чем фреймворк привязывает обработчики событий.
	 */
	create: (plugin: IPlugin<any, any>) => void
}

/**
 * Имена событий базы, которые плагин публикует наружу, — `create`.
 *
 * Выведены из `PLUGIN_EVENTS`, а не перечислены второй раз: один и тот же
 * список contribution плагина подмешивает в свои события (рантайм-проброс), и
 * из него же строятся типы дескриптора в `@soldy/setup`.
 */
export type TPluginPublicEventName = (typeof PLUGIN_EVENTS)[number]

/**
 * Внутренние события базы — `TPluginEvents` без опубликованных: `install` и
 * `destroy`. Эмиттер плагина их шлёт, это рабочая механика bundle, но наружу
 * они не уходят, поэтому `TPluginEventsFrom` в `@soldy/setup` снимает их с
 * карты плагина.
 */
export type TPluginInternalEvents = Omit<TPluginEvents, TPluginPublicEventName>

/**
 * Плагин — независимая единица логики, устанавливаемая на компонент.
 */
export interface IPlugin<
	// Параметр держит арность дженерика: аргумент передают на вызовах.
	// eslint-disable-next-line @typescript-eslint/no-unused-vars
	TInstance = any,
	TEvents extends Record<string, (...args: any) => any> = TPluginEvents,
> {
	readonly events: TEvented<TEvents>
	install(ctx: IPluginContext, options?: unknown): void
	/** Объявить плагин доступным снаружи. Вызывается adapter-слоем. */
	created(): void
	destroy(): void
}

/**
 * Конструктор плагина (со статическим namespace).
 */
export interface IPluginConstructor<
	TInstance = any,
	TEvents extends Record<string, (...args: any) => any> = TPluginEvents,
	P extends IPlugin<TInstance, TEvents> = IPlugin<TInstance, TEvents>,
> {
	new (): P
	/**
	 * Умолчания опций, которые плагин объявляет пропами, — тот же приём, что
	 * `static defaultValues` у классов ядра.
	 *
	 * С них плагин стартует, если опция не задана, и из них же setup собирает
	 * умолчание в декларацию пропа (`IPropDeclaration.default`), откуда его
	 * берёт адаптер. Умолчание в приватном поле метаданные не видят: адаптер
	 * подставил бы отсутствующему пропу своё значение и записал его в плагин.
	 */
	readonly defaultValues?: Readonly<Record<string, unknown>>
}

/**
 * Контейнер плагинов.
 */
/**
 * События набора: плагин встал и плагин снят — в любой момент жизни
 * компонента, не только при сборке. По ним setup подхватывает контракт
 * плагина, поставленного снаружи (`pluginProps`, `plugin:event`).
 */
export type TPluginBundleEvents = {
	/** Плагин установлен: после `install`. */
	use: (ctor: IPluginConstructor<any, any, any>, plugin: IPlugin<any, any>) => void
	/** Плагин снимается: до его `destroy`. */
	remove: (ctor: IPluginConstructor<any, any, any>, plugin: IPlugin<any, any>) => void
}

export interface IPluginBundle {
	/** Шина набора: `use`, `remove` (`TPluginBundleEvents`). */
	readonly events: TEvented<TPluginBundleEvents>
	/**
	 * Компонент, которому принадлежит набор.
	 *
	 * Тот же метод, что плагин внутри бандла видит как `ctx.getInstance()` —
	 * контекст отдаёт именно его, связанным. Одно имя и одна сигнатура снаружи
	 * и изнутри.
	 *
	 * Наружу нужен потому, что владельческий плагин получает от
	 * `TCollectionBundlesPlugin` бандлы элементов, а дотянуться должен до самих
	 * элементов — например, чтобы проставить им `data-*`.
	 */
	getInstance<T>(): T | null
	use<P extends IPlugin<any, any>>(
		PluginCtor: IPluginConstructor<any, any, P>,
		options?: object,
	): this
	get<P extends IPlugin<any, any>>(ctor: IPluginConstructor<any, any, P>): P | undefined
	remove<P extends IPlugin<any, any>>(PluginCtor: IPluginConstructor<any, any, P>): void
	/**
	 * Объявить набор наружу: `created()` у каждого плагина, в порядке установки.
	 * Плагин, поставленный после этого, объявляется сразу в `use()`. Повторный
	 * вызов и вызов на уничтоженном наборе ничего не делают. Вызывает setup
	 * (`assembleBundle`).
	 */
	created(): void
	/**
	 * Уничтожить набор: `destroy()` у каждого плагина, в обратном порядке
	 * установки, — и выставить `destroyed`. Вызывает владелец набора —
	 * адаптерный контекст, который его создал.
	 */
	destroy(): void
	/**
	 * Набор уничтожен (`destroy()`) и наружу больше не объявляется: плагин,
	 * который подписчик поставил бы в него, уничтожать уже некому. По нему
	 * setup не шлёт `bundle:create`, если набор уничтожили раньше, чем объявили.
	 */
	readonly destroyed: boolean
}
