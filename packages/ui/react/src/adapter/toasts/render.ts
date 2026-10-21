import type { TToastRender } from './types'

/**
 * Метки объектов-компонентов React — `memo`, `forwardRef` и `lazy`: такой
 * объект React рисует так же, как функцию. Метки — протокол React, по ним
 * объекты узнаёт и `react-is`; своя зависимость ради одной проверки пакету не
 * нужна.
 */
const COMPONENT_OBJECTS: ReadonlySet<unknown> = new Set([
	Symbol.for('react.memo'),
	Symbol.for('react.forward_ref'),
	Symbol.for('react.lazy'),
])

/**
 * Своё содержимое тоста — компонент React: функция или класс, а ещё
 * объект-компонент (`memo`, `forwardRef`, `lazy`) — `TToastRender` их пускает,
 * и без них `memo(Undo)` молча не нарисовался бы. Готовый элемент (`<Undo />`)
 * — не компонент: пропа `toast` он от тоста не получит, и у него метка
 * элемента, а не компонента. Строка — тоже нет: это имя тега, и проп `toast`
 * ушёл бы ему атрибутом. Ядро держит `render` как `unknown`, и разметка тоста
 * рисует его только после этой проверки, без приведения.
 */
export function isToastRender(value: unknown): value is TToastRender {
	if (typeof value === 'function') return true

	return (
		typeof value === 'object' &&
		value !== null &&
		'$$typeof' in value &&
		COMPONENT_OBJECTS.has(value.$$typeof)
	)
}
