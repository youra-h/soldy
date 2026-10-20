import type { TToastRender } from './types'

/**
 * Своё содержимое тоста — компонент Svelte. Компонент Svelte 5 — функция: её
 * собирает компилятор, а зовут `mount` и разметка родителя. Объект Svelte
 * нарисовать не может — у Vue объект определения компонента рисуется, здесь
 * нет. Ядро держит `render` как `unknown`, и разметка тоста рисует его, только
 * когда это компонент: проверкой, а не приведением.
 */
export function isToastRender(value: unknown): value is TToastRender {
	return typeof value === 'function'
}
