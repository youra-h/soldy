/**
 * Типы обмена: слушатели ячейки, состояния и событий.
 */

export type TSame<T> = (a: T, b: T) => boolean

export type TCellListener<T> = (value: T) => void

/** Слушатель состояния: имя свойства во фреймворке и его новое значение. */
export type TStateListener = (name: string, value: unknown) => void

/** Снимок всего состояния: неизменяемый, тот же объект, пока ни одно значение не сменилось. */
export type TStateSnapshot = Readonly<Record<string, unknown>>

/** Приёмник событий: имя во фреймворке и аргументы события ядра. */
export type TEventSink = (name: string, args: readonly unknown[]) => void

/** Нетипизированный вид шины владельца: имена событий слой знает строками из дескриптора. */
export interface IBus {
	on(event: string, handler: (...args: unknown[]) => void): void
	off(event: string, handler: (...args: unknown[]) => void): void
}
