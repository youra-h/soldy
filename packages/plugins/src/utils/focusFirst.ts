import { isFocusableElement } from './isFocusableElement'

/**
 * Ставит фокус на первого кандидата, который его принял, и говорит, нашёлся
 * ли такой. Скрытый, выключенный или отсоединённый элемент фокус не
 * принимает — его пропускают.
 *
 * Живёт в общих утилитах, а не у модели фокуса Popover: кандидатов перебирает
 * весь слой оверлея — база модели фокуса и обе её стратегии, немодальная и
 * модальная. Раскладку перебор не проверяет (в jsdom её нет), решает сам
 * браузер — потому кандидаты и перебираются по очереди.
 *
 * `options` уходят в `focus()` каждого кандидата как есть.
 */
export function focusFirst(candidates: readonly Element[], options?: FocusOptions): boolean {
	for (const candidate of candidates) {
		if (!isFocusableElement(candidate)) continue

		candidate.focus(options)

		if (candidate.ownerDocument.activeElement === candidate) return true
	}

	return false
}
