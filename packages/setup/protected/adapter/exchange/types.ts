/**
 * Типы обмена: описание участника, маршрут события, слушатели ячейки, состояния и событий.
 */

import type { TName, TPropSpec } from '../../define'

export type TSame<T> = (a: T, b: T) => boolean

export type TCellListener<T> = (value: T) => void

/** Слушатель состояния: имя свойства во фреймворке и его новое значение. */
export type TStateListener = (name: string, value: unknown) => void

/** Снимок всего состояния: неизменяемый, тот же объект, пока ни одно значение не сменилось. */
export type TStateSnapshot = Readonly<Record<string, unknown>>

/** Приёмник событий: имя во фреймворке и аргументы события ядра. */
export type TEventSink = (name: string, args: readonly unknown[]) => void

/**
 * Описание участника: что владелец объявляет наружу. Свойство типа, а не
 * монтирования — одно на дескриптор, определение плагина или контракт, и по
 * нему таблица маршрутов строится один раз на все монтирования.
 */
export interface IMemberSpec {
	readonly props: readonly TPropSpec[]
	/** Явные события владельца. Триггеры пропсов публикуются и без объявления здесь. */
	readonly events: readonly TName[]
}

/** Модель, которая уходит следом за событием: линия обмена и имя события привязки. */
export interface IModelRoute {
	/** Индекс линии в обмене. */
	readonly line: number
	/** Имя события привязки во фреймворке: `update:text`. */
	readonly name: string
}

/** Что обмен делает с событием участника. */
export interface IRoute {
	/** Ячейки состояния, для чьих свойств событие — триггер: индексы в состоянии обмена. */
	readonly cells: readonly number[]
	/** Имя события во фреймворке — если участник его публикует. */
	readonly event?: string
	/** Модели, которые уходят следом за событием: только у опубликованного. */
	readonly models: readonly IModelRoute[]
}

/** Слушатель всех событий шины: сырое имя и аргументы. */
export type TBusListener = (event: string, args: readonly unknown[]) => void

/**
 * Нетипизированный вид шины владельца: имена событий слой знает строками из
 * дескриптора. Обмену хватает слушателя всех событий — подписок на имена у
 * него нет.
 */
export interface IBus {
	listen(listener: TBusListener): () => void
}
