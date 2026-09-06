import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { TComponent, TComponentView, TDragAndDrop, TFrame } from '@soldy/core'
import type { IComponentViewProps } from '@soldy/core'

/**
 * rendered/visible живут в TComponentView, а не в TComponent: база должна
 * годиться и для невизуальных компонентов (TDragAndDrop, фасады коллекций).
 */
describe('TComponentView', () => {
	beforeEach(() => {
		vi.useFakeTimers()
	})

	afterEach(() => {
		vi.useRealTimers()
	})

	it('принимает props в формате { props }', () => {
		const m = new TComponentView<IComponentViewProps>({ rendered: false })
		expect(m.rendered).toBe(false)
	})

	it('принимает "голые" props без ключа props', () => {
		const m = new TComponentView<IComponentViewProps>({ rendered: false })
		expect(m.rendered).toBe(false)
	})

	it('create создаёт инстанс с переданными props', () => {
		const m = TComponentView.create({ rendered: false })
		expect(m).toBeInstanceOf(TComponentView)
		expect(m.rendered).toBe(false)
	})

	it('getProps возвращает актуальные свойства', () => {
		const m = new TComponentView<IComponentViewProps>({ rendered: false })
		expect(m.getProps()).toMatchObject({ rendered: false })
		m.rendered = true
		expect(m.getProps()).toMatchObject({ rendered: true })
	})

	it('assign использует сеттеры и меняет состояние', () => {
		const m = new TComponentView<IComponentViewProps>({ rendered: false })
		m.assign({ rendered: true })
		expect(m.rendered).toBe(true)
	})

	it('toJSON сериализует getProps()', () => {
		const m = new TComponentView<IComponentViewProps>({ rendered: false })
		expect(m.toJSON()).toMatchObject({ rendered: false })
	})
})

describe('TComponent — невизуальная база', () => {
	it('не имеет свойств отображения', () => {
		const c = new TComponent()

		expect('rendered' in c).toBe(false)
		expect('visible' in c).toBe(false)
		expect('present' in c).toBe(false)
		expect((c as any).show).toBeUndefined()
		expect((c as any).hide).toBeUndefined()
	})

	it('даёт события и реестр состояний', () => {
		const c = new TComponent()

		expect(c.events).toBeDefined()
		expect(c.states).toBeDefined()
	})

	it('TDragAndDrop — невизуальный, свойств отображения нет', () => {
		const dnd = new TDragAndDrop()

		expect(dnd).toBeInstanceOf(TComponent)
		expect(dnd).not.toBeInstanceOf(TComponentView)
		expect('visible' in dnd).toBe(false)
		expect('classes' in dnd).toBe(false)
	})

	it('TFrame — визуальный, наследует TComponentView', () => {
		const frame = new TFrame()

		expect(frame).toBeInstanceOf(TComponentView)
		expect(frame.visible).toBe(false) // TFrame.defaultValues
		expect(frame.classes.toArray()).toContain('s-frame')
	})
})
