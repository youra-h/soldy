import type { TToastRender } from './types'

/**
 * Своё содержимое тоста — компонент Solid, а компонент Solid — функция: её
 * зовёт разметка родителя (`Dynamic`). Объект Solid нарисовать не может — у
 * Vue объект определения компонента рисуется, здесь нет. Ядро держит `render`
 * как `unknown`, и разметка тоста рисует его, только когда это компонент:
 * проверкой, а не приведением.
 */
export function isToastRender(value: unknown): value is TToastRender {
	return typeof value === 'function'
}
