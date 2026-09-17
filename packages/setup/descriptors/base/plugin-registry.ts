/**
 * Реестр плагинов, поставленных снаружи на все компоненты одного типа.
 *
 *   usePlugins(TButton, [TTimerPlugin])                    // кнопки пользователя
 *   usePlugins(TButton, [TRipplePlugin], { scope: 'all' }) // и вложенные тоже
 *
 * Тип компонента — класс ядра, сравнение через `instanceof`: объект дескриптора
 * строится заново на каждом монтировании, а класс один. `instanceof` берёт и
 * наследника, переданного через `ctrl`.
 *
 * Вложенный компонент — деталь реализации чужой разметки (строка и крестик
 * тега). Разметка библиотеки помечает его признаком `embedded` с именем места,
 * и `scope: 'own'` (по умолчанию) его пропускает.
 *
 * Плагины регистрации ставятся после плагинов дескриптора, в порядке
 * регистрации, до `bundle:create`. Регистрация действует на компоненты, чей
 * набор собирается после неё: уже смонтированные не меняются. Внешний плагин
 * только добавляет — заменить плагин из состава компонента он не может.
 */

import type { IPropDeclaration, TName } from '@soldy/accessor'
import type { IPluginBundle, IPluginConstructor } from '@soldy/plugins'
import type { IPluginDefinition, TPluginEventsFrom, TPluginPropsFrom } from './types'

/** Какие компоненты типа получают плагин. */
export type TPluginScope = 'own' | 'all'

export interface IPluginRegistrationOptions {
	/**
	 * `'own'` — только компоненты, которые поставил пользователь; `'all'` — и
	 * вложенные в разметку других компонентов.
	 */
	scope?: TPluginScope
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

/** Контекст сборки набора: что знает о компоненте тот, кто его собирает. */
export interface IBundleContext {
	/** Имя места во вложенной разметке; нет — компонент поставил пользователь. */
	embedded?: string
}

/** Плагин, который компонент получает из реестра. */
export interface IResolvedPlugin {
	readonly ctor: IPluginConstructor<any, any, any>
	readonly options?: object
	/** Пропсы определения (`definePlugin`); у класса без определения их нет. */
	readonly props?: readonly IPropDeclaration[]
	readonly events?: readonly TName[]
}

/**
 * Типы плагинов реестра — дополнение модуля, как реестры значений темы:
 *
 *   declare module '@soldy/setup' {
 *     interface IRegisteredPlugins {
 *       timer: { type: IButton; plugin: ReturnType<typeof TimerPluginDescriptor> }
 *     }
 *   }
 *
 * Регистрация в рантайме типов не меняет, поэтому пропсы и события плагина
 * объявляются здесь второй раз. Ключ записи произвольный, `type` — интерфейс
 * инстанса: пропсы получает компонент, чей инстанс ему соответствует.
 */
// eslint-disable-next-line @typescript-eslint/no-empty-object-type
export interface IRegisteredPlugins {}

type TUnionToIntersection<U> = (U extends unknown ? (value: U) => void : never) extends (
	value: infer I,
) => void
	? I
	: never

/** Определения плагинов реестра, чей `type` подходит инстансу. */
type TRegisteredDefinitions<TInstance> = {
	[K in keyof IRegisteredPlugins]: IRegisteredPlugins[K] extends {
		type: infer T
		plugin: infer P extends IPluginDefinition
	}
		? TInstance extends T
			? P
			: never
		: never
}[keyof IRegisteredPlugins]

/** Пустое пересечение — `object`, а не `unknown`: результат пересекают с пропсами. */
type TOrEmpty<T> = unknown extends T ? object : T

/** Пропсы плагинов реестра для инстанса (namespaced); реестр пуст — `object`. */
export type TRegisteredPluginProps<TInstance> = TOrEmpty<
	TUnionToIntersection<
		TRegisteredDefinitions<TInstance> extends infer P
			? P extends IPluginDefinition
				? TPluginPropsFrom<readonly [P]>
				: never
			: never
	>
>

/** События плагинов реестра для инстанса (namespaced); реестр пуст — `object`. */
export type TRegisteredPluginEvents<TInstance> = TOrEmpty<
	TUnionToIntersection<
		TRegisteredDefinitions<TInstance> extends infer P
			? P extends IPluginDefinition
				? TPluginEventsFrom<readonly [P]>
				: never
			: never
	>
>

/**
 * Плагины реестра, поставленные в набор. Аксессор строится после набора и
 * берёт пропсы и события отсюда: пересчитать реестр заново нельзя — между
 * сборкой набора и аксессора регистрации могли смениться.
 *
 * Отдаются только аксессору владельца набора: фасад коллекции делит набор с
 * компонентом, и без сверки инстанса событие плагина ушло бы наружу дважды.
 */
const bundleRegistrations = new WeakMap<
	IPluginBundle,
	{ readonly owner: object; readonly plugins: readonly IResolvedPlugin[] }
>()

export function rememberRegisteredPlugins(
	bundle: IPluginBundle,
	owner: object,
	plugins: readonly IResolvedPlugin[],
): void {
	bundleRegistrations.set(bundle, { owner, plugins })
}

export function registeredPluginsOf(
	bundle: IPluginBundle | null,
	instance: object,
): readonly IResolvedPlugin[] {
	const record = bundle ? bundleRegistrations.get(bundle) : undefined

	return record?.owner === instance ? record.plugins : []
}

interface IRegistration {
	readonly type: abstract new (...args: any[]) => object
	readonly plugins: readonly IResolvedPlugin[]
	readonly scope: TPluginScope
}

const registrations: IRegistration[] = []

/**
 * Поставить плагины на все компоненты типа. Возвращает отмену регистрации:
 * её зовут, когда плагины больше не нужны новым компонентам (модуль выгружен,
 * тест закончился). Уже собранные наборы отмена не трогает.
 */
export function usePlugins(
	type: abstract new (...args: any[]) => object,
	plugins: readonly TRegisteredPlugin[],
	options: IPluginRegistrationOptions = {},
): () => void {
	const registration: IRegistration = {
		type,
		plugins: plugins.map((plugin) => ('ctor' in plugin ? plugin : { ctor: plugin })),
		scope: options.scope ?? 'own',
	}

	registrations.push(registration)

	return () => {
		const index = registrations.indexOf(registration)

		if (index !== -1) registrations.splice(index, 1)
	}
}

/**
 * Плагины реестра для компонента, в порядке регистрации. Один класс плагина —
 * один раз: у повторной регистрации побеждают опции последней, как у
 * приложения, которое донастраивает плагин темы.
 */
export function resolveRegisteredPlugins(
	instance: object,
	context: IBundleContext = {},
): IResolvedPlugin[] {
	const resolved = new Map<IPluginConstructor<any, any, any>, IResolvedPlugin>()

	for (const { type, plugins, scope } of registrations) {
		if (!(instance instanceof type)) continue
		if (scope === 'own' && context.embedded !== undefined) continue

		for (const plugin of plugins) {
			resolved.delete(plugin.ctor)
			resolved.set(plugin.ctor, plugin)
		}
	}

	return [...resolved.values()]
}
