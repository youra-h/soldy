/**
 * Гидратация поля формы: `for` подписи, сменившийся во время гидратации.
 *
 * Подпись Field сервер печатает раньше, чем контрол вошёл в поле, — её `for`
 * ведёт на `id` поля контрола от поля (`<id монтирования>-control`,
 * `field.server.spec.tsx`). Браузер собирает поле в том же порядке, и вход
 * контрола меняет набор подписи ещё во время гидратации: контрол со своим
 * `id` — `for` на него, группа — `for` снят, её называет ссылка
 * `aria-labelledby`. Пока Solid гидратирует, в узлы он не пишет, а спред
 * запоминает пропущенное как записанное, поэтому набор внутреннего узла
 * удерживает помощник адаптера (`createPartProps`): до конца гидратации — то,
 * что напечатал сервер, после — живое, и разницу спред дописывает в узел
 * (`src/adapter/common/root.ts`, шапка).
 *
 * Разметку сервера рисует перед прогоном его `globalSetup` (`server.tsx`);
 * страница — та же (`pages.tsx`).
 */

import { describe, it, expect } from 'vitest'
import { FieldGroup, FieldOwnId } from './pages'
import { expectServedNodes, hydrateServed, markupOf, serve } from './serve'

/** Подпись поля и узлы поля под ней — по порядку документа. */
const nodesOf = (container: HTMLElement) => [
	...container.querySelectorAll('.so-field__label, input, [role="radiogroup"]'),
]

/** Подпись поля; нет её — тест падает здесь. */
function labelOf(container: HTMLElement): HTMLLabelElement {
	const label = container.querySelector('.so-field__label')

	if (!(label instanceof HTMLLabelElement)) throw new Error('подписи поля нет')

	return label
}

describe('Field · гидратация', () => {
	it('контрол со своим id: у сервера for подписи не на него, после гидратации — на него', () => {
		const container = serve(markupOf('field-own-id'))
		const served = nodesOf(container)

		expect(labelOf(container).getAttribute('for')).not.toBe('email')
		expect(container.querySelector('input')?.id).toBe('email')

		hydrateServed(container, () => <FieldOwnId />)

		expectServedNodes(nodesOf(container), served)
		expect(labelOf(container).getAttribute('for')).toBe('email')
	})

	it('группа: у сервера for подписи есть, после гидратации — нет, называет её ссылка', () => {
		const container = serve(markupOf('field-group'))
		const served = nodesOf(container)
		const label = labelOf(container)

		expect(label.hasAttribute('for')).toBe(true)

		hydrateServed(container, () => <FieldGroup />)

		expectServedNodes(nodesOf(container), served)
		expect(label.hasAttribute('for')).toBe(false)
		expect(
			container.querySelector('[role="radiogroup"]')?.getAttribute('aria-labelledby'),
		).toBe(label.id)
	})
})
