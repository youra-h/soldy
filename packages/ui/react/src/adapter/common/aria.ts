/**
 * Перекладывает набор атрибутов доступности из ядра в props элемента.
 *
 * `aria-*` и `role` уходят как есть, а вот HTML-имена вроде `tabindex` — нет:
 * здесь ждут camelCase-проп `tabIndex` и на lowercase ругаются в консоль.
 * Ядро при этом обязано отдавать честные HTML-имена — их одинаково понимают
 * остальные пять адаптеров, ставящие атрибуты напрямую.
 */

import type { TAriaAttributes } from '@soldy/core'

/** HTML-атрибут → имя пропа. Только те, где имена расходятся. */
const ATTRIBUTE_TO_PROP: Record<string, string> = {
	tabindex: 'tabIndex',
	readonly: 'readOnly',
	for: 'htmlFor',
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
