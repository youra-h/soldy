import { reflectComponentType, type Type } from '@angular/core'
import type { TToastRender } from './types'

/**
 * Класс — функция со своим прототипом: так он отличается от стрелки и метода.
 * Что это компонент, решает уже `reflectComponentType`: ему нужен класс.
 */
function isClass(value: unknown): value is Type<unknown> {
	return typeof value === 'function' && typeof value.prototype === 'object'
}

/**
 * Своё содержимое тоста — класс компонента Angular (`TToastRender`). Ядро
 * держит `render` как `unknown`, и разметка тоста рисует его, только когда это
 * компонент: проверкой (`reflectComponentType` находит у класса описание
 * компонента), а не приведением. Функцию или объект Angular нарисовать не
 * может — у Vue объект определения компонента рисуется, здесь нет.
 */
export function isToastRender(value: unknown): value is TToastRender {
	return isClass(value) && reflectComponentType(value) !== null
}
