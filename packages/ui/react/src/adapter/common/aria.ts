/**
 * Набор атрибутов ядра — в пропсы элемента: HTML-имена, которые у React
 * другие (`tabindex` → `tabIndex`), переводятся, `null` — атрибута нет.
 */

import type { TAriaAttributes } from '@soldy-ui/core'

/** HTML-атрибут → имя пропа: только те, где имена расходятся. */
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
		if (value === null) continue

		result[ATTRIBUTE_TO_PROP[name] ?? name] = value
	}

	return result
}
