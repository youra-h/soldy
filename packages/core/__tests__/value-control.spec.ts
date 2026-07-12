import { describe, it, expect, vi } from 'vitest'
import { TValueControl } from '@soldy/core'
import type { IValueControlProps } from '@soldy/core'

describe('TValueControl', () => {
	it('принимает value/name через { props } и через plain props', () => {
		type P = IValueControlProps<string>

		const a = new TValueControl<string, P>({ props: { value: 'A', name: 'n1' } } as any)
		expect(a.value).toBe('A')
		expect(a.name).toBe('n1')

		const b = new TValueControl<string, P>({ value: 'B', name: 'n2' } as any)
		expect(b.value).toBe('B')
		expect(b.name).toBe('n2')
	})

	it('value setter эмитит changeValue, input() эмитит inputValue', () => {
		type P = IValueControlProps<string>
		const c = new TValueControl<string, P>({ value: 'x', name: 'n' } as any)
		const changeHandler = vi.fn()
		const inputHandler = vi.fn()
		c.events.on('changeValue', changeHandler)
		c.events.on('inputValue', inputHandler)

		c.value = 'y'
		expect(changeHandler).toHaveBeenCalledWith({ newValue: 'y', oldValue: 'x' })
		expect(c.value).toBe('y')
	})

	it('name setter эмитит changeName', () => {
		type P = IValueControlProps<string>
		const c = new TValueControl<string, P>({ value: 'x', name: 'a' } as any)
		const handler = vi.fn()
		c.events.on('changeName', handler)

		c.name = 'b'
		expect(handler).toHaveBeenCalledWith('b')
		expect(c.name).toBe('b')
	})

	it('assign меняет value и name', () => {
		type P = IValueControlProps<string>
		const c = new TValueControl<string, P>({ value: 'x', name: 'a' } as any)
		c.assign({ value: 'y', name: 'b' } as any)
		expect(c.value).toBe('y')
		expect(c.name).toBe('b')
	})

	it('getProps/toJSON отражают value и name', () => {
		type P = IValueControlProps<string>
		const c = new TValueControl<string, P>({ value: 'x', name: 'a' } as any)
		const props = c.getProps()
		expect(props).toMatchObject({ value: 'x', name: 'a' })
		expect(c.toJSON()).toEqual(props)
	})
})
