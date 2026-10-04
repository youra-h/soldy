import { focusFirst } from './focusFirst'
import { tabStops } from './tabStops'

/**
 * Tab по кругу внутри панели — ловушка модального оверлея.
 *
 * С последней остановки панели Tab ведёт на первую, а Shift+Tab с первой — на
 * последнюю. Панель без единой остановки держит фокус на себе
 * (`tabindex="-1"`), и Tab с неё никуда не уводит. Порядок остановок внутри
 * ведёт браузер — ловушка вмешивается только на краях. Фокус увели из панели
 * мимо неё (`focus()` со стороны, нажатие в поле владельца) — Tab возвращает
 * его в панель, а не гадает, откуда он ушёл.
 *
 * Живёт в общих утилитах, а не у модальной модели фокуса: Tab замыкают и
 * модальное окно с выезжающей панелью (`TModalFocusPlugin`), и панель
 * DatePicker (`TDatePickerFocusPlugin`), у которой остальная модель своя.
 * Вторая копия правила разошлась бы с первой.
 */
export function trapTab(event: KeyboardEvent, panel: Element): void {
	const active = panel.ownerDocument.activeElement

	if (!active) return

	if (!panel.contains(active)) {
		if (focusFirst([...tabStops(panel), panel])) event.preventDefault()

		return
	}

	const stops = tabStops(panel)

	// Фокусировать внутри нечего: панель держит его сама, и Tab с неё никуда
	// не ведёт
	if (stops.length === 0) {
		event.preventDefault()

		return
	}

	const edge = event.shiftKey ? stops[0] : stops[stops.length - 1]

	// Не край панели — порядок ведёт браузер
	if (active !== edge && active !== panel) return

	const wrapped = event.shiftKey ? [...stops].reverse() : stops

	if (focusFirst(wrapped)) event.preventDefault()
}
