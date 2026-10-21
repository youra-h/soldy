import type { TToastRender } from './types'

/**
 * Своё содержимое тоста — функция, которая отдаёт узел (`TToastRender`). Ядро
 * держит `render` как `unknown`, и разметка тоста зовёт его, только когда это
 * функция: проверкой, а не приведением. Что функция отдаёт узел, проверка
 * сказать не может — это контракт API (`toastsOf`), как компонент у Svelte.
 */
export function isToastRender(value: unknown): value is TToastRender {
	return typeof value === 'function'
}
