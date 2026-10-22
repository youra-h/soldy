/**
 * Стиль корня и текст поля после гидратации.
 *
 * Стиль корня в браузере ставит attachment по свойствам
 * (`src/adapter/runtime/root-style.svelte.ts`), а на сервере он уходит строкой
 * атрибута. Стиль сервера на узле attachment принимает своим: свойство,
 * которого у браузера нет, снимает, как сняла бы его гидратация самого
 * Svelte, а совпавшее оставляет. Здесь `display: none` ставит только сервер:
 * кнопку скрытой рисует только он (`visible: false`).
 *
 * Текст поля в браузере ставит attachment поля, и только когда он разошёлся
 * с узлом (`src/adapter/runtime/field-text.ts`), а сервер отдаёт его атрибутом
 * `value` у `<input>` и содержимым у `<textarea>`. Содержимое сервера у
 * `<textarea>` Svelte при гидратации снимает, и текст в узел возвращает
 * attachment.
 *
 * Разметку сервера рисует перед прогоном его `globalSetup` (`server.ts`) теми
 * же страницами.
 */

import { describe, it, expect } from 'vitest'
import { flushSync, type ComponentProps } from 'svelte'
import { find } from '../mount'
import { reactiveProps } from '../reactive-props.svelte'
import ButtonStyle from './ButtonStyle.test.svelte'
import FieldText from './FieldText.test.svelte'
import { expectServedNodes, hydrateServed, markupOf, serve } from './serve'

describe('стиль корня · гидратация', () => {
	it('свойство, которого у браузера нет, снято, стиль потребителя остался — на узле сервера', () => {
		const container = serve(markupOf('button-style-hidden'))
		const served = [...container.querySelectorAll('*')]
		const button = find(container, '.so-button', HTMLElement)

		expect(button.style.display).toBe('none')

		hydrateServed(container, ButtonStyle, {})

		expectServedNodes([...container.querySelectorAll('*')], served)
		expect(Array.from(button.style)).toEqual(['color'])
		expect(button.style.color).toBe('red')
	})
})

describe('текст поля · гидратация', () => {
	const input = (scope: ParentNode) => find(scope, '.so-input input', HTMLInputElement)
	const textarea = (scope: ParentNode) =>
		find(scope, '.so-textarea textarea', HTMLTextAreaElement)

	it('у <input> и <textarea> — текст значения, узлы — от сервера', () => {
		const container = serve(markupOf('field-text'))
		const served = [...container.querySelectorAll('*')]

		hydrateServed(container, FieldText, {})

		expectServedNodes([...container.querySelectorAll('*')], served)
		expect(input(container).value).toBe('Иван')
		expect(textarea(container).value).toBe('Привет')
	})

	/**
	 * Текст `<input>` после гидратации был бы на месте и без attachment-а — его
	 * дал атрибут сервера. Что текст ведёт attachment, видно по новому значению:
	 * оно доходит до узла сервера.
	 */
	it('новое значение после гидратации — в узле сервера', () => {
		const container = serve(markupOf('field-text'))
		const served = [input(container), textarea(container)]
		const props = reactiveProps<ComponentProps<typeof FieldText>>({})

		hydrateServed(container, FieldText, props)

		props.input = 'Пётр'
		props.textarea = 'Пока'
		flushSync()

		expectServedNodes([input(container), textarea(container)], served)
		expect(input(container).value).toBe('Пётр')
		expect(textarea(container).value).toBe('Пока')
	})
})
