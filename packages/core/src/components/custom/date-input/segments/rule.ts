import { digitOf, formatFieldNumber } from './digits'
import type { TPartEntry, TPartErase, TPartRule } from './types'
import type { TDatePartLimits } from '../types'

/**
 * Заготовки правил частей: числовая часть и общие шаги. Из них группы даты и
 * времени собирают свои правила.
 */

/** Число — то, что видит пользователь, — оно же хранится; соседей часть не трогает. */
export const AS_IS: Pick<TPartRule, 'shown' | 'stored' | 'settle'> = {
	shown: (value) => value,
	stored: (shown) => shown,
	settle: (parts) => parts,
}

/**
 * Правило числовой части: текст — число цифрами локали не короче `width`
 * цифр, ввод — цифрами. Набранные нули без числа — цифрами локали как есть:
 * «0» — «0», «00» — «00».
 */
export function numberRule(
	width: number,
	digits: readonly string[],
	rule: Omit<TPartRule, 'numeric' | 'text' | 'typedText' | 'enter' | 'erase'>,
): TPartRule {
	return {
		...rule,
		numeric: true,
		text: (shown) => formatFieldNumber(shown, width, digits),
		typedText: (typed) => formatFieldNumber(Number(typed), typed.length, digits),
		enter: (parts, typed, key, validate) => {
			const digit = digitOf(key, digits)

			return digit === undefined
				? undefined
				: enterDigit(rule.limits(parts), typed, digit, validate)
		},
		erase: (shown) => eraseDigit(shown, width),
	}
}

/** Число в отрезке. */
export function clamp(value: number, min: number, max: number): number {
	return Math.min(Math.max(value, min), max)
}

/** Число по кругу отрезка: за концом — начало, перед началом — конец. */
export function wrap(value: number, min: number, max: number): number {
	const size = max - min + 1

	return ((((value - min) % size) + size) % size) + min
}

/**
 * Цифра в числовую часть с ходом `limits`. Цифры копятся, пока число в ходе
 * части, иначе часть начинается с новой цифры. Дописать больше некуда —
 * следующая цифра вывела бы за ход или цифр уже столько, сколько у края хода,
 * — набранное сбрасывается, и фокус уходит на следующую часть.
 *
 * Число ниже хода (нули дня, месяца, года, часа `h12` и `h24`) — обычные
 * цифры: пока дописать есть куда, числа у части нет, и она показывает
 * набранное («0»). Дописать некуда — без проверки (`validate`) число
 * записывается как есть и фокус уходит дальше: «00» у дня — день 0, верна ли
 * дата, решает приложение. С проверкой часть стоит на набранном и ждёт цифры:
 * из «00» и «5» выйдет 5, лишний ноль не копится.
 */
function enterDigit(
	{ min, max }: TDatePartLimits,
	typed: string,
	digit: number,
	validate: boolean,
): TPartEntry {
	const entered = `${typed}${digit}`
	const number = Number(entered)
	const value = number > max ? digit : number
	const full = Number(`${number}0`) > max || entered.length >= String(max).length

	if (value < min && !full) return { shown: undefined, typed: entered, advance: false }
	if (value < min && validate) {
		return { shown: undefined, typed: entered.slice(-String(max).length), advance: false }
	}

	return { shown: value, typed: full ? '' : entered, advance: full }
}

/**
 * Стереть последнюю цифру числа части («12» — 1, «05» — пусто): дальше набор
 * дописывает к тому, что осталось. Осталось ноль — часть пустеет.
 */
function eraseDigit(shown: number, width: number): TPartErase {
	const rest = String(shown).padStart(width, '0').slice(0, -1)
	const number = Number(rest)

	if (!Number.isFinite(number) || number === 0) return { shown: undefined, typed: '' }

	return { shown: number, typed: rest }
}
