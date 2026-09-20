/**
 * Сколько тегов помещается в ряд — чистая функция, без DOM.
 *
 * Замер идёт без обратной связи: в режиме `popover` тег не сжимается, ширина
 * у него натуральная и одинаковая в ряду и в панели, поэтому ответ считается
 * за один проход, а не подбором «показать — спрятать». Отсюда и проверяемость:
 * весь счёт здесь, а плагин рядом только читает узлы.
 */

export type TFitOptions = {
	/** Ширина, которую раскладка даёт ряду (содержимое, без рамок и отступов). */
	available: number
	/**
	 * Натуральные ширины тегов в порядке набора. `undefined` — тег ещё не
	 * измерен: в закрытой панели у него нулевой бокс, и мерить там нечего.
	 */
	widths: ReadonlyArray<number | undefined>
	/** Зазор между соседями ряда. */
	gap: number
	/**
	 * Место под кнопку «…». `undefined` — кнопки в разметке ещё не было:
	 * резервировать нечего, и первый проход считает без неё. Кнопка появится
	 * вместе с хвостом, следующий проход учтёт её ширину.
	 */
	more: number | undefined
}

/**
 * Число первых тегов, которые остаются в ряду. Остальные уезжают в панель.
 *
 * Правила, которые здесь выражены:
 *
 * - **кнопка без гистерезиса**: помещаются все теги без кнопки — кнопки нет,
 *   и место под неё не резервируется;
 * - **неизмеренный тег остаётся в ряду**: иначе он уехал бы в закрытую
 *   панель, где его нулевой бокс не измерить уже никогда;
 * - **неразложенный ряд не делится**: нулевая ширина значит «раскладки ещё
 *   нет», а не «не помещается ничего».
 */
export function countFitting({ available, widths, gap, more }: TFitOptions): number {
	if (available <= 0 || widths.length === 0) return widths.length

	const known = (width: number | undefined): number => width ?? 0
	const total =
		widths.reduce<number>((sum, width) => sum + known(width), 0) + gap * (widths.length - 1)

	if (total <= available) return widths.length

	const limit = available - (more === undefined ? 0 : more + gap)

	let used = 0
	let count = 0

	for (const width of widths) {
		if (width === undefined) {
			count++

			continue
		}

		// Первый занятый тег идёт без зазора: зазор стоит между соседями.
		// Скрытый тег (нулевая ширина) соседом не считается — его в ряду нет
		const next = used === 0 ? width : used + gap + width

		if (next > limit) break

		used = next
		count++
	}

	return count
}
