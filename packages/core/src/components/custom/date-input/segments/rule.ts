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
 * цифр, ввод — цифрами. Набранные нули без числа — тоже цифрами локали, не
 * короче `width` и не короче набранного: «0» у дня — «00», у года — «0», а
 * «000» — «000».
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
		typedText: (typed) =>
			formatFieldNumber(Number(typed), Math.max(width, typed.length), digits),
		enter: (parts, typed, key) => {
			const digit = digitOf(key, digits)

			return digit === undefined ? undefined : enterDigit(rule.limits(parts), typed, digit)
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
 * Ноль, с которого часть не начинается (ноля нет в её ходе: день, месяц, год,
 * час `h12` и `h24`), — обычная первая цифра: числа у части нет до следующей
 * цифры, и набранные нули она показывает. Из «0» и «5» выйдет 5, а минута,
 * секунда и час `h11` и `h23` с нуля начинаются — у них ноль и есть число.
 * Нули без числа дописываются, пока есть куда; дальше лишний ноль не копится:
 * набранного остаётся на цифру меньше края хода («00» у дня — снова «0»), и
 * часть ждёт цифры.
 */
function enterDigit({ min, max }: TDatePartLimits, typed: string, digit: number): TPartEntry {
	const entered = `${typed}${digit}`
	const number = Number(entered)
	const value = number > max ? digit : number
	const settable = value !== 0 || min === 0
	const full = Number(`${number}0`) > max || entered.length >= String(max).length

	if (!settable) {
		return { shown: undefined, typed: full ? entered.slice(1) : entered, advance: false }
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
