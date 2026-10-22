// @vitest-environment jsdom

/**
 * Сборка над инстансом атомарна для остальных его монтирований (`TAssembling`).
 *
 * Над внешним `ctrl` бывает больше одного монтирования: фреймворк собирает
 * новый компонент, пока прежний ещё не снят. Сборка пишет в инстанс — `id`
 * плагинов связок от нового монтирования, — и состояние прежнего перечитывает
 * это не посреди сборки, а одной микрозадачей после неё: итог, а не каждый
 * шаг. Вне сборки триггер перечитывает состояние сразу, как прежде. События
 * тишиной не задерживаются.
 */

import { describe, it, expect } from 'vitest'
import { TPopover } from '@soldy-ui/core'
import { PopoverDescriptor } from '../content/descriptors'
import { createAdapterContext } from '../protected/adapter'
import { CommonProfile } from '../protected/naming'

/** Смонтировать над `ctrl` и слушать состояние: имена свойств, о которых пришло уведомление. */
function mountOver(ctrl: TPopover, mountId: string) {
	const context = createAdapterContext(PopoverDescriptor(), { ctrl, mountId })
	const exchange = context.connect(CommonProfile)
	const heard: string[] = []
	const off = exchange.state.subscribe((name) => heard.push(name))

	heard.length = 0

	return { context, exchange, heard, off }
}

describe('TAssembling: сборка над инстансом атомарна для остальных монтирований', () => {
	it('прежнее монтирование перечитывает записи сборки после неё, а не посреди', async () => {
		const ctrl = new TPopover()
		const first = mountOver(ctrl, 'a')
		const before = first.exchange.state.getSnapshot()

		createAdapterContext(PopoverDescriptor(), { ctrl, mountId: 'b' })

		// Сборка записала id нового монтирования — прежнее ещё не слышало
		expect(first.heard).toEqual([])
		expect(first.exchange.state.getSnapshot()).toBe(before)

		await Promise.resolve()

		expect(first.heard.length).toBeGreaterThan(0)
		expect(first.exchange.state.getSnapshot()).not.toBe(before)
		expect(JSON.stringify(first.exchange.state.getSnapshot())).toContain('b')
		first.off()
	})

	it('вне сборки триггер перечитывает состояние сразу', () => {
		const ctrl = new TPopover()
		const mounted = mountOver(ctrl, 'a')

		ctrl.triggerAria.add('aria-label', 'Меню')

		expect(mounted.heard).not.toEqual([])
		mounted.off()
	})

	it('события тишиной не задерживаются: прежнее монтирование слышит их посреди сборки', () => {
		const ctrl = new TPopover()
		const mounted = mountOver(ctrl, 'a')
		const events: string[] = []
		const off = mounted.exchange.events.listen((event) => events.push(event))

		createAdapterContext(PopoverDescriptor(), { ctrl, mountId: 'b' })

		expect(events).toContain('change:aria')
		off()
		mounted.off()
	})

	it('сборка без чужих монтирований ничего не откладывает: своё состояние читается сразу', () => {
		const ctrl = new TPopover()
		const mounted = mountOver(ctrl, 'a')

		expect(JSON.stringify(mounted.exchange.state.getSnapshot())).toContain('a')
		mounted.off()
	})
})
