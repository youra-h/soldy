import type { TToastRender } from './types'

/**
 * Своё содержимое тоста — компонент Vue: объект определения или функция
 * (функциональный компонент, класс). Ядро держит `render` как `unknown`, и
 * разметка тоста рисует его, только когда это компонент: проверкой, а не
 * приведением.
 */
export function isToastRender(value: unknown): value is TToastRender {
	return typeof value === 'function' || (typeof value === 'object' && value !== null)
}
