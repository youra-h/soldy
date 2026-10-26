import { describe, it, expect, vi } from 'vitest'
import { TClasses } from '@soldy-ui/core'

describe('TClasses', () => {
	it('toArray возвращает base + statics + dynamics', () => {
		const c = new TClasses('so-test', undefined, ['static1'])
		expect(c.toArray()).toEqual(['so-test', 'static1'])

		c.add('--mod', true)
		expect(c.toArray()).toContain('so-test--mod')

		c.add(() => 'so-dynamic')
		expect(c.toArray()).toContain('so-dynamic')
	})

	it('add/remove зовут функцию владельца и управляют статическими классами', () => {
		const handler = vi.fn()
		const c = new TClasses('so-test', handler)

		c.add('--x', true)
		expect(c.toArray()).toContain('so-test--x')
		expect(handler).toHaveBeenCalledTimes(1)

		c.remove('--x', true)
		expect(c.toArray()).not.toContain('so-test--x')
		expect(handler).toHaveBeenCalledTimes(2)

		// A repeated removal does not report a change
		c.remove('--x', true)
		expect(handler).toHaveBeenCalledTimes(2)
	})

	it('динамическая запись зовёт функцию владельца', () => {
		const handler = vi.fn()
		const c = new TClasses('so-test', handler)

		c.add(() => 'so-dynamic')
		c.add(() => null)
		expect(c.toArray()).toEqual(['so-test', 'so-dynamic'])
		expect(handler).toHaveBeenCalledTimes(2)
	})

	it('начальные классы функцию владельца не зовут', () => {
		const handler = vi.fn()
		const c = new TClasses('so-test', handler, ['static1'])

		expect(c.has('static1', false)).toBe(true)
		expect(handler).not.toHaveBeenCalled()
	})

	it('пустой набор — только базовый класс', () => {
		const c = new TClasses('so-test')

		expect(c.toArray()).toEqual(['so-test'])
		expect(c.has('--x')).toBe(false)
		expect(c.get('--x')).toBeUndefined()
		expect('events' in c).toBe(false)
	})

	it('toggle управляет классом по булевому значению', () => {
		const c = new TClasses('so-test')
		c.toggle('--active', true)
		expect(c.toArray()).toContain('so-test--active')

		c.toggle('--active', false)
		expect(c.toArray()).not.toContain('so-test--active')
	})

	it('swapClass меняет один класс на другой', () => {
		const c = new TClasses('so-test')
		c.add('--size-normal', true)
		expect(c.toArray()).toContain('so-test--size-normal')

		c.swapClass({ oldClass: '--size-normal', newClass: '--size-xl' })
		expect(c.toArray()).toContain('so-test--size-xl')
		expect(c.toArray()).not.toContain('so-test--size-normal')
	})

	it('swap меняет класс по prefix+value', () => {
		const c = new TClasses('so-test')
		c.add('--variant-danger', true)

		c.swap({ prefix: '--variant-', oldValue: 'danger', newValue: 'brand' })
		expect(c.toArray()).toContain('so-test--variant-brand')
		expect(c.toArray()).not.toContain('so-test--variant-danger')
	})

	/**
	 * На этом держатся модификаторы темы: значения может не быть, и тогда
	 * класса нет вовсе, а не `--variant-undefined`.
	 */
	it('swap пропускает пустое значение с обеих сторон', () => {
		const c = new TClasses('so-test')

		c.swap({ prefix: '--variant-', newValue: undefined })
		expect(c.toArray()).toEqual(['so-test'])

		c.swap({ prefix: '--variant-', newValue: 'brand' })
		c.swap({ prefix: '--variant-', oldValue: 'brand', newValue: undefined })
		expect(c.toArray()).toEqual(['so-test'])
	})

	it('setBase обновляет базовый класс и зовёт функцию владельца', () => {
		const handler = vi.fn()
		const c = new TClasses('a', handler)

		c.setBase('b')
		expect(c.base).toBe('b')
		expect(handler).toHaveBeenCalledTimes(1)

		// The same base — no change reported
		c.setBase('b')
		expect(handler).toHaveBeenCalledTimes(1)
	})
})
