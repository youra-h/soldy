import type { TToastRender } from './types'

/** Своё содержимое тоста — компонент Svelte, то есть функция. */
export function isToastRender(value: unknown): value is TToastRender {
	return typeof value === 'function'
}
