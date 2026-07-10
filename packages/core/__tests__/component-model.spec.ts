import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { TComponent } from '@soldy/core'
import type { IComponentProps } from '@soldy/core'

describe('TComponent', () => {
	beforeEach(() => {
		vi.useFakeTimers()
	})

	afterEach(() => {
		vi.useRealTimers()
	})

	it('принимает props в формате { props }', () => {
		const m = new TComponent<IComponentProps>({ props: { rendered: false } })
		expect(m.rendered).toBe(false)
	})

	it('принимает "голые" props без ключа props', () => {
		const m = new TComponent<IComponentProps>({ rendered: false })
		expect(m.rendered).toBe(false)
	})

	it('create создаёт инстанс с переданными props', () => {
		const m = TComponent.create({ rendered: false })
		expect(m).toBeInstanceOf(TComponent)
		expect(m.rendered).toBe(false)
	})

	it('getProps возвращает актуальные свойства', () => {
		const m = new TComponent<IComponentProps>({ rendered: false })
		expect(m.getProps()).toMatchObject({ rendered: false })
		m.rendered = true
		expect(m.getProps()).toMatchObject({ rendered: true })
	})

	it('assign использует сеттеры и меняет состояние', () => {
		const m = new TComponent<IComponentProps>({ rendered: false })
		m.assign({ rendered: true })
		expect(m.rendered).toBe(true)
	})

	it('toJSON сериализует getProps()', () => {
		const m = new TComponent<IComponentProps>({ rendered: false })
		expect(m.toJSON()).toMatchObject({ rendered: false })
	})

	it('эмитит created асинхронно после конструктора', () => {
		const m = new TComponent<IComponentProps>({ rendered: true })
		const handler = vi.fn()
		m.events.on('created', handler)

		vi.runAllTimers()
		expect(handler).toHaveBeenCalledTimes(1)
		expect(handler.mock.calls[0]?.[0]).toBe(m)
	})
})
