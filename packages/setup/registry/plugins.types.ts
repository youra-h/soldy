/**
 * Пропсы и события плагинов реестра в типах адаптеров — из дополнения `IRegisteredPlugins`.
 *
 * Регистрация в рантайме типов не меняет, поэтому пропсы и события плагина
 * объявляются второй раз — дополнением модуля, как реестры значений темы:
 *
 *   declare module '@soldy/setup' {
 *     interface IRegisteredPlugins {
 *       timer: { type: IButton; plugin: ReturnType<typeof TimerPluginDescriptor> }
 *     }
 *   }
 *
 * Ключ записи произвольный, `type` — интерфейс инстанса: пропсы получает
 * компонент, чей инстанс ему соответствует. Дополняется интерфейс через корень
 * пакета, поэтому его реэкспорт до `@soldy/setup` обязателен.
 */

import type { IPluginDefinition, TPluginEventsFrom, TPluginPropsFrom } from '../define'

/** Записи плагинов реестра: дополняются модулем `@soldy/setup`. */
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
