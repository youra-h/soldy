import type { IContextElevator } from '@soldy/accessor'

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
