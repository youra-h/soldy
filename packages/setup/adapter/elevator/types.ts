/**
 * Контракт лифта: типизированный ключ, фабрика фреймворка и регистрация элемента коллекции.
 */

import type { IContextElevator } from '@soldy/accessor'
import type { IPluginBundle } from '@soldy/plugins'

/**
 * Ключ elevator'а вместе с типом значения — как `InjectionKey<T>` во Vue.
 *
 * Фабрика выводит `T` из ключа, поэтому `up()` отдаёт значение нужного типа без
 * приведения, а `down()` не примет чужое.
 */
export interface IElevatorKey<T> {
	readonly name: string
	/** Фантом: только несёт тип значения, в рантайме не заполняется. */
	readonly __value?: T
}

/**
 * Фабрика, которую предоставляет конкретный фреймворк (Vue, React и т.д.).
 *
 * Пример для Vue:
 * ```ts
 * const VueElevatorFactory: TElevatorFactory = (key) => new TVueElevator(key.name)
 * ```
 */
export type TElevatorFactory = <T>(key: IElevatorKey<T>) => IContextElevator<T>

/** Регистрация элемента в родительской коллекции; возвращает снятие регистрации. */
export type TCollectionItemRegister = (item: object, bundle: IPluginBundle | null) => () => void
