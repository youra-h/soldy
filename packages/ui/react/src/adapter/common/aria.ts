/**
 * Перекладывает набор атрибутов доступности из ядра в props элемента.
 *
 * `aria-*` и `role` уходят как есть, а вот HTML-имена вроде `tabindex` — нет:
 * здесь ждут camelCase-проп `tabIndex` и на lowercase ругаются в консоль.
 * Ядро при этом обязано отдавать честные HTML-имена — их одинаково понимают
 * остальные пять адаптеров, ставящие атрибуты напрямую.
 */

import type { TAriaAttributes } from '@soldy-ui/core'

/**
 * HTML-атрибут → имя пропа. Только те, где имена расходятся. `inputmode` —
 * экранная клавиатура: у поля числа её пишет ядро в набор ввода (`inputAttrs`
 * NumberInput), а сенсорный плагин — поверх; у частей поля даты — сенсорный
 * плагин DateInput (`TDateInputTouchPlugin`) в их наборы (`segmentSets`).
 * Он же пишет частям на касание `contenteditable`, `spellcheck` и
 * `autocorrect`: часть становится редактируемой, без проверки орфографии и
 * автозамены.
 */
const ATTRIBUTE_TO_PROP: Record<string, string> = {
	tabindex: 'tabIndex',
	readonly: 'readOnly',
	for: 'htmlFor',
	inputmode: 'inputMode',
	contenteditable: 'contentEditable',
	spellcheck: 'spellCheck',
	autocorrect: 'autoCorrect',
}

export function toAriaProps(aria: TAriaAttributes | undefined): Record<string, unknown> {
	if (!aria) return {}

	const result: Record<string, unknown> = {}

	for (const [name, value] of Object.entries(aria)) {
		// null означает «атрибут не ставить»
		if (value === null) continue

		result[ATTRIBUTE_TO_PROP[name] ?? name] = value
	}

	return result
}
