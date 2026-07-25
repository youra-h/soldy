import type { IContextElevator } from '@soldy/accessor'

/**
 * Фабрика, которую предоставляет конкретный фреймворк (Vue, React и т.д.).
 *
 * Пример для Vue:
 * ```ts
 * const vueElevatorFactory = <T>(key: string | symbol) => new VueElevator<T>(key)
 * ```
 */
export type TElevatorFactory = <T>(key: string | symbol) => IContextElevator<T>
