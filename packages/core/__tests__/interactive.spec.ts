import { describe, it, expect, vi } from 'vitest'
import { TInteractive } from '@soldy-ui/core'

describe('TInteractive', () => {
	it('меняет disabled/focused и эмитит события', () => {
		const interactive = new TInteractive()
		const disabledHandler = vi.fn()
		const focusedHandler = vi.fn()
		interactive.events.on('change:disabled', disabledHandler)
		interactive.events.on('change:focused', focusedHandler)

		interactive.disabled = true
		expect(interactive.disabled).toBe(true)
		expect(disabledHandler).toHaveBeenCalledWith(true)

		interactive.focused = true
		expect(interactive.focused).toBe(true)
		expect(focusedHandler).toHaveBeenCalledWith(true)

		interactive.disabled = false
		interactive.focused = false
		expect(disabledHandler).toHaveBeenCalledTimes(2)
		expect(focusedHandler).toHaveBeenCalledTimes(2)
	})

	it('change:disabled:before подменяет значение, change:disabled несёт подменённое', () => {
		const interactive = new TInteractive()
		const changes = vi.fn()

		interactive.events.on('change:disabled', changes)
		interactive.events.on('change:focused:before', (e) => {
			if (interactive.disabled) e.value = false
		})
		interactive.events.on('change:disabled:before', (e) => {
			e.value = true
		})

		interactive.disabled = true
		interactive.focused = true

		expect(changes).toHaveBeenCalledOnce()
		expect(changes).toHaveBeenCalledWith(true)
		expect(interactive.focused).toBe(false)
	})
})
