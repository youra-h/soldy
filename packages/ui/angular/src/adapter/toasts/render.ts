import { reflectComponentType, type Type } from '@angular/core'

/**
 * Своё содержимое тоста — класс компонента Angular со входом `toast`; рисует
 * его `NgComponentOutlet`. Ядро держит `render` как `unknown`, тип даёт
 * `useToasts()`.
 */
export type TToastRender = Type<unknown>

function isClass(value: unknown): value is Type<unknown> {
	return typeof value === 'function' && typeof value.prototype === 'object'
}

/** Проверкой, а не приведением: функцию или объект Angular нарисовать не может. */
export function isToastRender(value: unknown): value is TToastRender {
	return isClass(value) && reflectComponentType(value) !== null
}
