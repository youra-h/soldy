import { describe, it, expect, vi } from 'vitest'
import { TClasses, TDataset, TSubscribable } from '@soldy-ui/core'

class TProbe extends TSubscribable {
	change(): void {
		this._notify()
	}
}

describe('TSubscribable', () => {
	it('подписчик зовётся на каждое изменение и получает сам объект', () => {
		const probe = new TProbe()
		const subscriber = vi.fn()

		probe.subscribe(subscriber)
		probe.change()
		probe.change()

		expect(subscriber).toHaveBeenCalledTimes(2)
		expect(subscriber).toHaveBeenNthCalledWith(1, probe)
		expect(subscriber).toHaveBeenNthCalledWith(2, probe)
		expect(subscriber.mock.calls[0][0]).toBe(probe)
	})

	/**
	 * The object is the argument so that one listener can serve several of them
	 * and tell them apart by identity — the way `TComponentView` listens to its
	 * four sets with one function.
	 */
	it('один подписчик на несколько объектов узнаёт источник по аргументу', () => {
		const first = new TProbe()
		const second = new TProbe()
		const sources: TSubscribable[] = []
		const subscriber = (source: TSubscribable): void => {
			sources.push(source)
		}

		first.subscribe(subscriber)
		second.subscribe(subscriber)
		second.change()
		first.change()

		expect(sources).toHaveLength(2)
		expect(sources[0]).toBe(second)
		expect(sources[1]).toBe(first)
	})

	it('без подписчиков изменение никого не зовёт', () => {
		expect(() => new TProbe().change()).not.toThrow()
	})

	it('подписчиков несколько — каждый, в порядке подписки', () => {
		const probe = new TProbe()
		const calls: string[] = []

		probe.subscribe(() => calls.push('a'))
		probe.subscribe(() => calls.push('b'))
		probe.subscribe(() => calls.push('c'))
		probe.change()

		expect(calls).toEqual(['a', 'b', 'c'])
	})

	it('тот же подписчик дважды — одна подписка', () => {
		const probe = new TProbe()
		const subscriber = vi.fn()

		probe.subscribe(subscriber)
		probe.subscribe(subscriber)
		probe.change()

		expect(subscriber).toHaveBeenCalledTimes(1)
	})

	it('отписка снимает только своего подписчика, повторная ничего не делает', () => {
		const probe = new TProbe()
		const a = vi.fn()
		const b = vi.fn()
		const c = vi.fn()

		probe.subscribe(a)
		const offB = probe.subscribe(b)
		probe.subscribe(c)

		offB()
		offB()
		probe.change()

		expect(a).toHaveBeenCalledTimes(1)
		expect(b).not.toHaveBeenCalled()
		expect(c).toHaveBeenCalledTimes(1)
	})

	it('после отписки последнего подписчика изменение никого не зовёт', () => {
		const probe = new TProbe()
		const a = vi.fn()
		const b = vi.fn()

		const offA = probe.subscribe(a)
		const offB = probe.subscribe(b)

		offA()
		offB()
		probe.change()

		expect(a).not.toHaveBeenCalled()
		expect(b).not.toHaveBeenCalled()
	})

	it('добавленный за изменение зовётся со следующего, снятый — ещё в текущем', () => {
		const probe = new TProbe()
		const late = vi.fn()
		const removed = vi.fn()
		let offRemoved = (): void => {}

		probe.subscribe(() => {
			probe.subscribe(late)
			offRemoved()
		})
		offRemoved = probe.subscribe(removed)

		probe.change()

		expect(late).not.toHaveBeenCalled()
		expect(removed).toHaveBeenCalledTimes(1)

		probe.change()

		expect(late).toHaveBeenCalledTimes(1)
		expect(removed).toHaveBeenCalledTimes(1)
	})

	/** One mechanism for every set: attributes and classes alike. */
	it('наборы — TSubscribable: потребитель слушает рядом с владельцем', () => {
		const dataset = new TDataset()
		const classes = new TClasses('so-test')
		const owner = vi.fn()
		const consumer = vi.fn()

		expect(dataset).toBeInstanceOf(TSubscribable)
		expect(classes).toBeInstanceOf(TSubscribable)

		dataset.subscribe(owner)
		dataset.subscribe(consumer)
		classes.subscribe(owner)
		dataset.add('open', true)
		classes.add('--open')

		expect(owner).toHaveBeenCalledTimes(2)
		expect(owner.mock.calls[0][0]).toBe(dataset)
		expect(owner.mock.calls[1][0]).toBe(classes)
		expect(consumer).toHaveBeenCalledTimes(1)
		expect(consumer.mock.calls[0][0]).toBe(dataset)
	})
})
