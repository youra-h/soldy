/**
 * `TItemRow` — кнопка, чью роль и остановку Tab пишет владелец набором
 * `aria` на том же узле: строка тега, которую тег отдаёт кнопке через `ctrl`.
 *
 * По устройству это `TButton` — блок, слоты, `press`, — а `role` и `tabindex`
 * она себе не пишет ни на каком теге. `TButton` на `div` объявляет себя
 * кнопкой и остановкой Tab, и строка без действия принимала фокус от клика,
 * хотя владелец гасил её остановку `tabindex="-1"`.
 */

import { describe, it, expect } from 'vitest'
import { TButton, TItemRow } from '../src'

describe('TItemRow · роль и остановка Tab — у владельца', () => {
	it.each(['div', 'span', 'button'])('на %s ни role, ни tabindex', (tag) => {
		const button = new TItemRow({ tag })

		expect(button.aria.has('role')).toBe(false)
		expect(button.aria.has('tabindex')).toBe(false)
	})

	it('смена тега и выключение их не возвращают', () => {
		const button = new TItemRow({ tag: 'div' })

		button.tag = 'span'
		button.disabled = true
		button.disabled = false
		button.tag = 'button'
		button.tag = 'div'

		expect(button.aria.toObject()).toEqual({})
	})

	it('aria-disabled — как у TButton: это состояние самой кнопки', () => {
		const row = new TItemRow({ tag: 'div', disabled: true })
		const button = new TButton({ tag: 'div', disabled: true })

		expect(row.aria.get('aria-disabled')).toBe('true')
		expect(row.aria.get('aria-disabled')).toBe(button.aria.get('aria-disabled'))

		row.disabled = false

		expect(row.aria.has('aria-disabled')).toBe(false)
	})

	it('на нативной кнопке — нативный disabled, как у TButton', () => {
		const row = new TItemRow({ disabled: true })

		expect(row.tag).toBe('button')
		expect(row.attrs.get('disabled')).toBe('disabled')
		expect(row.aria.has('aria-disabled')).toBe(false)
	})

	it('остальное — кнопки: блок so-button, текст, вид', () => {
		const button = new TItemRow({ tag: 'div', text: 'Почта', view: 'ghost' })

		expect(button).toBeInstanceOf(TButton)
		expect(button.classes.toArray()).toEqual(
			expect.arrayContaining(['so-button', 'so-button--view-ghost']),
		)
		expect(button.text).toBe('Почта')
	})
})
