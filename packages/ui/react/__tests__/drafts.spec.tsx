/**
 * TDrafts — сборки, которые React ещё не принял, и освобождение тех, что он
 * отбросил.
 *
 * React об отброшенной сборке не сообщает, поэтому её освобождает следующая
 * сборка того же `ctrl` или движка. Сборка, отброшенная без следующей, живёт
 * до неё — и освобождается, как только тот же `ctrl` или движок собирают
 * снова. Настоящий цикл React сторожит `external-lifetime.spec.tsx`, здесь —
 * правила без фреймворка.
 */

import { describe, it, expect, vi } from 'vitest'
import { TDrafts } from '../src/adapter/runtime/drafts.class'

describe('TDrafts', () => {
	it('непринятую сборку уничтожает следующая сборка того же ctrl — один раз', () => {
		const drafts = new TDrafts()
		const ctrl = {}
		const destroy = vi.fn()

		drafts.add(drafts.take({ ctrl }), destroy)
		drafts.take({ ctrl })
		drafts.take({ ctrl })

		expect(destroy).toHaveBeenCalledTimes(1)
	})

	it('отброшенная без следующей сборка живёт, пока тот же ctrl не соберут снова', () => {
		const drafts = new TDrafts()
		const ctrl = {}
		const destroy = vi.fn()

		drafts.add(drafts.take({ ctrl }), destroy)
		drafts.take({ ctrl: {} })

		expect(destroy).not.toHaveBeenCalled()

		drafts.take({ ctrl })

		expect(destroy).toHaveBeenCalledTimes(1)
	})

	it('принятую сборку следующая не трогает', () => {
		const drafts = new TDrafts()
		const ctrl = {}
		const destroy = vi.fn()
		const held = drafts.take({ ctrl })

		drafts.add(held, destroy)
		drafts.accept(held)
		drafts.take({ ctrl })

		expect(destroy).not.toHaveBeenCalled()
	})

	it('движок фасада из опций — такой же ключ, как ctrl', () => {
		const drafts = new TDrafts()
		const engine = {}
		const destroy = vi.fn()

		drafts.add(drafts.take({ options: { owner: {}, engine } }), destroy)
		drafts.take({ options: { engine } })

		expect(destroy).toHaveBeenCalledTimes(1)
	})

	it('сборку, взявшую ctrl и движок, уничтожает любой из них, и только раз', () => {
		const drafts = new TDrafts()
		const ctrl = {}
		const engine = {}
		const destroy = vi.fn()

		drafts.add([...drafts.take({ ctrl }), ...drafts.take({ options: { engine } })], destroy)
		drafts.take({ options: { engine } })
		drafts.take({ ctrl })

		expect(destroy).toHaveBeenCalledTimes(1)
	})

	it('без ctrl и движка сборка ничего не берёт и не запоминается', () => {
		const drafts = new TDrafts()

		expect(drafts.take({ props: { text: 'x' }, options: { owner: {} } })).toEqual([])
	})
})
