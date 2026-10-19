import type { INumberInput } from '@soldy-ui/core'
import type { TNumberInputButton } from './types'

/**
 * Узлы поля числа — один поиск на все плагины поля: набор, клавиши, кнопки
 * шага и сенсорный режим находят ввод и кнопки одинаково.
 *
 * Узлы находят по классам владельца (`classes.resolve`), а не строкой в
 * плагине, и только внутри его корня. Ввод — по своему классу: рядом в корне
 * лежит скрытое поле формы.
 */

/** Ввод поля — `__input` в корне. */
export function inputOf(owner: INumberInput, root: Element): HTMLInputElement | null {
	const input = root.querySelector(owner.classes.resolve('__input', { point: true }))

	return input instanceof HTMLInputElement ? input : null
}

/** Цель события — ввод этого поля, а не поле в слоте и не кнопка. */
export function isInputOf(
	owner: INumberInput,
	root: Element,
	target: EventTarget | null,
): target is HTMLInputElement {
	return target !== null && target === inputOf(owner, root)
}

/**
 * Кнопка шага, в узле которой лежит `target`: «меньше» (`__decrement`) или
 * «больше» (`__increment`). Не кнопка шага этого поля — `undefined`.
 */
export function buttonOf(
	owner: INumberInput,
	root: Element,
	target: EventTarget | null,
): TNumberInputButton | undefined {
	if (!(target instanceof Element)) return undefined

	for (const direction of [-1, 1] as const) {
		const entry = direction > 0 ? '__increment' : '__decrement'
		const element = target.closest(owner.classes.resolve(entry, { point: true }))

		if (element && root.contains(element)) return { direction, element }
	}

	return undefined
}

/** Выключена ли кнопка шага в эту сторону — у края, выключенного поля и только для чтения. */
export function isButtonDisabled(owner: INumberInput, direction: 1 | -1): boolean {
	return direction > 0 ? owner.incrementDisabled : owner.decrementDisabled
}
