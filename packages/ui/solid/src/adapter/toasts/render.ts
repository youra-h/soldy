import type { TToastRender } from './types'

/** Своё содержимое тоста рисуется, только когда это компонент Solid — функция. */
export function isToastRender(value: unknown): value is TToastRender {
	return typeof value === 'function'
}
