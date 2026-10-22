// @vitest-environment jsdom

/**
 * Сборка над инстансом атомарна для остальных его монтирований (`TAssembling`).
 *
 * Над внешним `ctrl` бывает больше одного монтирования: фреймворк собирает
 * новый компонент, пока прежний ещё не снят. Сборка пишет в инстанс — `id`
 * плагинов связок от нового монтирования, начальные значения, — и обмен
 * прежнего отдаёт это фреймворку не посреди сборки, а одной микрозадачей
 * после неё: сначала состояние, потом уведомления по порядку. Отменяемые
 * события уходят сразу, и `preventDefault` прежнего монтирования отменяет
 * запись сборки, как вне её. Вне сборки всё уходит сразу, как прежде.
 */

import { describe, it, expect } from 'vitest'
import { TActionEvent, TPopover } from '@soldy-ui/core'
import { PopoverDescriptor } from '../content/descriptors'
import { createAdapterContext } from '../protected/adapter'
import { CommonProfile } from '../protected/naming'

/** Смонтировать над `ctrl`: что и в каком порядке слышат состояние и события обмена. */
function mountOver(ctrl: TPopover, mountId: string, onEvent?: (args: readonly unknown[]) => void) {
	const context = createAdapterContext(PopoverDescriptor(), { ctrl, mountId })
	const exchange = context.connect(CommonProfile)
	const heard: string[] = []
	const offState = exchange.state.subscribe((name) => heard.push(`state:${name}`))
	const offEvents = exchange.events.listen((event, args) => {
		heard.push(`event:${event}`)
		onEvent?.(args)
	})

	heard.length = 0

	return {
		exchange,
		heard,
		off: () => {
			offState()
			offEvents()
		},
	}
}

/** Приёмник, который отвечает «нет» на каждое отменяемое событие. */
const veto = (args: readonly unknown[]) => {
	if (args[0] instanceof TActionEvent) args[0].preventDefault()
}

describe('TAssembling: сборка над инстансом атомарна для остальных монтирований', () => {
	it('состояние и уведомления прежнего монтирования — после сборки: сначала состояние, потом события', async () => {
		const ctrl = new TPopover()
		const first = mountOver(ctrl, 'a')
		const before = first.exchange.state.getSnapshot()

		createAdapterContext(PopoverDescriptor(), { ctrl, mountId: 'b' })

		// Сборка записала id нового монтирования — прежнее ещё ничего не слышало
		expect(first.heard).toEqual([])
		expect(first.exchange.state.getSnapshot()).toBe(before)

		await Promise.resolve()

		const firstEvent = first.heard.findIndex((entry) => entry.startsWith('event:'))
		const lastState = first.heard.reduce(
			(last, entry, index) => (entry.startsWith('state:') ? index : last),
			-1,
		)

		expect(first.heard).toContain('event:change:aria')
		expect(lastState).toBeGreaterThanOrEqual(0)
		expect(lastState).toBeLessThan(firstEvent)
		expect(JSON.stringify(first.exchange.state.getSnapshot())).toContain('b')
		first.off()
	})

	it('отменяемое событие — сразу: preventDefault прежнего монтирования отменяет запись сборки', () => {
		const ctrl = new TPopover()
		const first = mountOver(ctrl, 'a', veto)

		createAdapterContext(PopoverDescriptor(), {
			ctrl,
			mountId: 'b',
			props: { visible: false },
		})

		expect(first.heard).toContain('event:hide:before')
		expect(ctrl.visible).toBe(true)
		first.off()
	})

	it('вне сборки состояние и события — сразу', () => {
		const ctrl = new TPopover()
		const mounted = mountOver(ctrl, 'a')

		ctrl.triggerAria.add('aria-label', 'Меню')

		expect(mounted.heard.some((entry) => entry.startsWith('state:'))).toBe(true)
		expect(mounted.heard).toContain('event:change:triggerAria')
		mounted.off()
	})

	it('отменяемое событие вне сборки — сразу, и preventDefault отменяет', () => {
		const ctrl = new TPopover()
		const mounted = mountOver(ctrl, 'a', veto)

		ctrl.hide()

		expect(mounted.heard).toContain('event:hide:before')
		expect(ctrl.visible).toBe(true)
		mounted.off()
	})

	it('приёмник, снятый до выпуска, получает уведомление один раз; подписавшийся после события — нет', async () => {
		const ctrl = new TPopover()
		const first = mountOver(ctrl, 'a')

		createAdapterContext(PopoverDescriptor(), { ctrl, mountId: 'b' })

		// Прежнее монтирование снято тем же проходом, что собрал новое
		first.off()

		const late: string[] = []
		const offLate = first.exchange.events.listen((event) => late.push(event))

		await Promise.resolve()

		expect(first.heard.filter((entry) => entry === 'event:change:aria')).toHaveLength(1)
		expect(late).not.toContain('change:aria')
		offLate()
	})

	it('уведомление сразу после сборки не обгоняет накопленные', async () => {
		const ctrl = new TPopover()
		const first = mountOver(ctrl, 'a')

		createAdapterContext(PopoverDescriptor(), { ctrl, mountId: 'b' })
		ctrl.triggerAria.add('aria-label', 'Меню')

		expect(first.heard).toEqual([])

		await Promise.resolve()

		const events = first.heard.filter((entry) => entry.startsWith('event:'))

		expect(events.indexOf('event:change:aria')).toBeGreaterThanOrEqual(0)
		expect(events.indexOf('event:change:triggerAria')).toBeGreaterThan(
			events.indexOf('event:change:aria'),
		)
		first.off()
	})
})
