import type { IContextElevator } from '@soldy/accessor'

/**
 * Фабрика, которую предоставляет конкретный фреймворк (Vue, React и т.д.).
 *
 * Пример для Vue:
 * ```ts
 * const VueElevatorFactory = <T>(key: string | symbol) => new TVueElevator<T>(key)
 * ```
 */
export type TElevatorFactory = <T>(key: string | symbol) => IContextElevator<T>
