/**
 * Набор по первым буквам (APG, «type-ahead»): буква ведёт подсветку к
 * элементу, чей текст с неё начинается.
 *
 * Правило одно на списки с подсветкой — меню сейчас, комбобокс Select
 * следующим. Поэтому оно — модуль с буфером и поиском, а не метод одного
 * плагина: подсветку и клавиши каждый плагин держит сам, а что считать
 * набором и куда он ведёт, решает этот модуль.
 *
 * - Буквы, набранные быстрее паузы (`timeout`), — одно слово: «со» ищет
 *   «Сохранить», а не следующий пункт на «о».
 * - Поиск идёт по кругу от подсвеченного элемента. Слово ищется с него
 *   самого: дописанная буква не уводит с элемента, который ещё подходит.
 *   Одна буква ищется со следующего — так повтор буквы ходит по элементам на
 *   неё («с», «с», «с» — «Сохранить», «Сохранить как», «Создать»), и
 *   повторённая буква («ссс») значит то же, что одна.
 * - Совпадения нет — подсветка остаётся на месте.
 *
 * Регистр не важен. Элементы — те, по которым идёт навигация: недоступные
 * плагин отсеивает сам.
 */

/** Пауза, после которой следующая буква начинает новый набор, мс. */
export const TYPEAHEAD_TIMEOUT = 500

export class TTypeahead {
	private _query = ''
	private _at = 0

	/** @param timeout — пауза, после которой следующая буква начинает новый набор, мс */
	constructor(private readonly _timeout: number = TYPEAHEAD_TIMEOUT) {}

	/**
	 * Идёт ли набор: с последней буквы прошло не больше паузы. Пока он идёт,
	 * пробел — тоже буква («Сохранить как»), а не нажатие элемента.
	 */
	typing(now: number = Date.now()): boolean {
		return this._query !== '' && now - this._at <= this._timeout
	}

	/**
	 * Буква набора: продолжить слово или начать новое — и найти элемент.
	 *
	 * @param char — набранная буква
	 * @param items — элементы по порядку, по которым идёт навигация
	 * @param current — подсвеченный элемент; `null` — поиск с первого
	 * @param textOf — текст элемента, по которому идёт сравнение
	 * @returns элемент, на который встать, или `null` — совпадения нет, и
	 *   подсветка остаётся на месте
	 */
	next<TItem>(
		char: string,
		items: readonly TItem[],
		current: TItem | null,
		textOf: (item: TItem) => string,
		now: number = Date.now(),
	): TItem | null {
		this._query = this.typing(now) ? this._query + char : char
		this._at = now

		return match(items, current, this._query, textOf)
	}

	/** Сбросить набор: следующая буква начнёт новый. */
	reset(): void {
		this._query = ''
		this._at = 0
	}
}

/**
 * Первый по кругу элемент, чей текст начинается с набранного. Повторённая
 * буква — это одна буква: ищется со следующего за подсвеченным.
 */
function match<TItem>(
	items: readonly TItem[],
	current: TItem | null,
	query: string,
	textOf: (item: TItem) => string,
): TItem | null {
	const needle = query.toLowerCase()
	const search = [...needle].every((char) => char === needle[0]) ? needle[0] : needle
	const index = current === null ? -1 : items.indexOf(current)
	// Слово — с подсвеченного, буква — со следующего; подсветки нет — с первого
	const from = index === -1 ? 0 : index + (search.length === 1 ? 1 : 0)

	for (let step = 0; step < items.length; step++) {
		const item = items[(from + step) % items.length]

		if (textOf(item).trim().toLowerCase().startsWith(search)) return item
	}

	return null
}
