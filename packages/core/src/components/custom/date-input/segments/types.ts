import type { TDateFieldPart, TDateInputParts, TDatePartLimits } from '../types'

/**
 * Итог знака в части: число, которое видит пользователь, и набранные цифры.
 * Числа нет (`undefined`) — часть после знака без числа: ноль, с которого она
 * не начинается, снимает её число до следующей цифры, и часть показывает
 * набранное (`typedText`).
 */
export type TPartEntry = {
	readonly shown: number | undefined
	/** Набранные цифры части: к ним допишется следующая */
	readonly typed: string
	/** Дописать в часть больше некуда — фокус на следующую */
	readonly advance: boolean
}

/** Итог Backspace в части: число (`undefined` — часть пустеет) и набранные цифры. */
export type TPartErase = {
	readonly shown: number | undefined
	readonly typed: string
}

/**
 * Правило части — всё, чем части различаются. Правило уже в формате локали:
 * цифры, календарь поля и цикл часов в нём замкнуты, поэтому общий механизм
 * частей ни о дате, ни о времени не знает.
 */
export type TPartRule = {
	/** Подсказка пустой части */
	readonly placeholder: string
	/** Число из цифр (`true`) или слово (`false`, период суток): вставка ищет в тексте группы цифр */
	readonly numeric: boolean
	/** Ход части в числах, которые видит пользователь */
	limits(parts: TDateInputParts): TDatePartLimits
	/** Число, которое видит пользователь, по хранимому */
	shown(value: number): number
	/** Хранимое число по тому, что видит пользователь */
	stored(shown: number, parts: TDateInputParts): number
	/** Шаг ↑/↓: по кругу хода или до его края */
	step(value: number, min: number, max: number): number
	/** Текст части с числом `shown` */
	text(shown: number): string
	/** Текст набранных цифр, пока числа у части нет: нули ниже её хода («0») */
	typedText(typed: string): string
	/**
	 * Знак в часть; знак не этой части — `undefined`. `validate` — число ниже
	 * хода не записывается, часть ждёт следующей цифры
	 */
	enter(
		parts: TDateInputParts,
		typed: string,
		key: string,
		validate: boolean,
	): TPartEntry | undefined
	/** Backspace по набранной части с числом `shown` */
	erase(shown: number): TPartErase
	/** Части после записи этой части — согласованные с ней соседи её группы */
	settle(parts: TDateInputParts): TDateInputParts
}

/** Часть формата поля: тип части и её правило в локали. */
export type TFieldPart = {
	readonly type: TDateFieldPart
	readonly rule: TPartRule
}

/** Итог знака для поля: части после набора. */
export type TKeyEntry = {
	readonly parts: TDateInputParts
	readonly typed: string
	readonly advance: boolean
}

/** Итог стирания для поля: части и набранные цифры, к которым допишется следующая. */
export type TDigitErase = {
	readonly parts: TDateInputParts
	readonly typed: string
}
