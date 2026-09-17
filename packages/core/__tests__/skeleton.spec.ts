import { describe, it, expect } from 'vitest'
import { TSkeleton } from '@soldy/core'
import type { TSkeletonShape, TSkeletonAnimation } from '@soldy/core'

describe('TSkeleton', () => {
	/**
	 * Форма, анимация и вариант — значения темы: по умолчанию их нет, и
	 * заглушка выглядит так, как тема рисует блок без модификаторов.
	 */
	it('should create with default values', () => {
		const skeleton = new TSkeleton()

		expect(skeleton.variant).toBeUndefined()
		expect(skeleton.shape).toBeUndefined()
		expect(skeleton.animation).toBeUndefined()
		expect(skeleton.width).toBe('auto')
		expect(skeleton.height).toBe('auto')
	})

	it('should create with custom props', () => {
		const skeleton = new TSkeleton({
			variant: 'brand',
			shape: 'pill',
			animation: 'shimmer',
			width: 120,
			height: 60,
		})

		expect(skeleton.variant).toBe('brand')
		expect(skeleton.shape).toBe('pill')
		expect(skeleton.animation).toBe('shimmer')
		expect(skeleton.width).toBe(120)
		expect(skeleton.height).toBe(60)
	})

	it('should change shape', () => {
		const skeleton = new TSkeleton()
		const shapes: TSkeletonShape[] = ['square', 'pill']

		for (const shape of shapes) {
			skeleton.shape = shape
			expect(skeleton.shape).toBe(shape)
		}
	})

	it('should change animation', () => {
		const skeleton = new TSkeleton()
		const animations: TSkeletonAnimation[] = ['shimmer', 'blink']

		for (const animation of animations) {
			skeleton.animation = animation
			expect(skeleton.animation).toBe(animation)
		}
	})

	it('should change width and height', () => {
		const skeleton = new TSkeleton()

		skeleton.width = 200
		expect(skeleton.width).toBe(200)

		skeleton.height = 100
		expect(skeleton.height).toBe(100)

		skeleton.width = '50%'
		expect(skeleton.width).toBe('50%')

		skeleton.height = 'auto'
		expect(skeleton.height).toBe('auto')
	})

	it('should emit events on property changes', () => {
		const skeleton = new TSkeleton()
		const events: string[] = []

		skeleton.events.on('change:shape', () => events.push('shape'))
		skeleton.events.on('change:animation', () => events.push('animation'))
		skeleton.events.on('change:width', () => events.push('width'))
		skeleton.events.on('change:height', () => events.push('height'))

		skeleton.shape = 'pill'
		skeleton.animation = 'shimmer'
		skeleton.width = 100
		skeleton.height = 50

		expect(events).toEqual(['shape', 'animation', 'width', 'height'])
	})

	it('should have base class', () => {
		const skeleton = new TSkeleton()
		expect(skeleton.classes.base).toBe('s-skeleton')
	})

	it('should have shape class', () => {
		const skeleton = new TSkeleton({ shape: 'pill' })
		expect(skeleton.classes.has('--shape-pill')).toBe(true)

		skeleton.shape = 'square'
		expect(skeleton.classes.has('--shape-square')).toBe(true)
		expect(skeleton.classes.has('--shape-pill')).toBe(false)

		skeleton.shape = undefined
		expect(skeleton.classes.has('--shape-square')).toBe(false)
	})

	it('should have animation class', () => {
		const skeleton = new TSkeleton({ animation: 'shimmer' })
		expect(skeleton.classes.has('--animation-shimmer')).toBe(true)

		skeleton.animation = 'blink'
		expect(skeleton.classes.has('--animation-blink')).toBe(true)
		expect(skeleton.classes.has('--animation-shimmer')).toBe(false)

		skeleton.animation = undefined
		expect(skeleton.classes.has('--animation-blink')).toBe(false)
	})

	it('should have variant class', () => {
		const skeleton = new TSkeleton({ variant: 'brand' })
		expect(skeleton.classes.has('--variant-brand')).toBe(true)

		skeleton.variant = 'danger'
		expect(skeleton.classes.has('--variant-danger')).toBe(true)
		expect(skeleton.classes.has('--variant-brand')).toBe(false)
	})
})
