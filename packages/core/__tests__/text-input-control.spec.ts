import { describe, it, expect, vi } from 'vitest'
import { TInputControl } from '@soldy/core'

describe('TInputControl', () => {
	it('принимает form-flags через { props } и через plain props', () => {
		const a = new TInputControl({
			value: '', readonly: true, required: true,
		})
		expect(a.readonly).toBe(true)
		expect(a.required).toBe(true)
	})

	it('сеттерами эмитит change:* события', () => {
		const c = new TInputControl({ value: '' })
		const ro = vi.fn()
		const req = vi.fn()
		c.events.on('change:readonly', ro)
		c.events.on('change:required', req)

		c.readonly = true
		expect(ro).toHaveBeenCalledWith(true)
		c.required = true
		expect(req).toHaveBeenCalledWith(true)
	})

	it('getProps/toJSON отражают input flags', () => {
		const c = new TInputControl({
			value: '',
			readonly: true,
			required: true,
		})
		const props = c.getProps()
		expect(props).toMatchObject({ readonly: true, required: true })
		expect(c.toJSON()).toEqual(props)
	})

	it('value setter эмитит change:value и input:value', () => {
		const c = new TInputControl({ value: 'a' })
		const change = vi.fn()
		const input = vi.fn()
		c.events.on('change:value', change)
		c.events.on('input:value', input)

		c.value = 'b'
		expect(change).toHaveBeenCalledWith({ newValue: 'b', oldValue: 'a' })
		expect(input).toHaveBeenCalledWith({ newValue: 'b', oldValue: 'a' })
		expect(c.value).toBe('b')
	})
})
