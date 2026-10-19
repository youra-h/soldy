/**
 * Направление текста локали: по первому сильному знаку, как его поставил
 * Intl. Общее у полей, которые пишут значение строкой формата, — ряда частей
 * поля даты и текста поля числа.
 */

/** Метки направления — сильные знаки сами по себе. */
const RLM = '‏'
const ALM = '؜'
const LRM = '‎'

/**
 * Метки направления и изолирующие знаки: ALM, LRM, RLM, встраивания и
 * изоляты. Intl ставит их в литералы формата (`ar-EG` — RLM перед «/», ALM
 * перед минусом), а в тексте, который вставляют или набирают в поле, они не
 * значат ничего: разбор их снимает.
 */
export const DIRECTION_MARKS = /[؜‎‏‪-‮⁦-⁩]/g

/**
 * Слабые цифры: европейские (ASCII и полноширинные) и арабские обоих видов —
 * направления они не задают. Цифры остальных систем сильные, как буквы своей
 * письменности.
 */
const WEAK_DIGIT = /[0-9٠-٩۰-۹０-９]/

/** Буква или цифра — знак, который может быть сильным. */
const ALPHANUMERIC = /[\p{L}\p{N}]/u

/** Письменности справа налево: их буквы и сильные цифры (`nkoo`, `adlm`). */
const RTL_SCRIPT =
	/[\p{Script=Hebrew}\p{Script=Arabic}\p{Script=Syriac}\p{Script=Thaana}\p{Script=Nko}\p{Script=Samaritan}\p{Script=Mandaic}\p{Script=Adlam}\p{Script=Hanifi_Rohingya}]/u

/**
 * Направление по первому сильному знаку текста: буква или сильная цифра
 * письменности справа налево и метки RLM и ALM — справа налево, остальные
 * буквы, сильные цифры и метка LRM — слева направо. Европейские и арабские
 * цифры, знаки и пробелы — слабые. Сильного знака нет — слева направо.
 */
export function directionOf(text: string): 'ltr' | 'rtl' {
	for (const char of text) {
		if (char === RLM || char === ALM) return 'rtl'
		if (char === LRM) return 'ltr'
		if (WEAK_DIGIT.test(char) || !ALPHANUMERIC.test(char)) continue

		return RTL_SCRIPT.test(char) ? 'rtl' : 'ltr'
	}

	return 'ltr'
}
