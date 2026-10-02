/**
 * `bindOverlayOpen` — привязка плагина оверлея к открытости владельца.
 *
 * Подписка живёт на шине владельца, а владелец бывает долговечнее плагина:
 * свой `ctrl` приложения переживает перемонтирование, и каждое монтирование
 * ставит ему новый набор. Поэтому подписывается привязка методом плагина
 * (`_listenTo`), и подписку ведёт база: начинает с принятия набора, снимает в
 * `destroy()` — ровно свою: соседние привязки на том же владельце (плагины
 * одного набора, набор следующего монтирования) продолжают работать. Смену
 * открытости до принятия подписка не застаёт — её перечитывает `sync`.
 *
 * Владелец — `TPopover`: у него есть `open` и шина событий. Своё событие
 * открытости (`event`) проверяется на владельце-заглушке: у классов ядра
 * открытость сообщает `change:open`.
 */

import { describe, it, expect } from 'vitest'
import { TEvented, TPopover } from '@soldy-ui/core'
import { TBasePlugin, TPluginBundle } from '../src'
import type { IOverlayOpenOptions, IOverlayOpenState, IPluginContext } from '../src'
import { bindOverlayOpen } from '../src/custom/overlay/open-state'

/** Плагин оверлея: привязка подписывается его `_listenTo` и перечитывается при принятии. */
class TOpenProbePlugin extends TBasePlugin {
	readonly changes: boolean[] = []
	open: IOverlayOpenState | null = null

	override install(ctx: IPluginContext, options?: IOverlayOpenOptions): void {
		super.install(ctx, options)

		this.open = bindOverlayOpen(
			ctx,
			options,
			(open) => this.changes.push(open),
			(source, event, handler) => this._listenTo(source, event, handler),
		)
	}

	override attach(): void {
		super.attach()

		this.open?.sync()
	}
}

/** Набор с плагином-зондом над владельцем: без плагина дальше проверять нечего. */
function mount(owner: object, options?: IOverlayOpenOptions) {
	const bundle = new TPluginBundle(owner).use(TOpenProbePlugin, options)
	const plugin = bundle.get(TOpenProbePlugin)

	if (!plugin?.open) throw new Error('привязки нет: у владельца не объявлено свойство открытости')

	return { bundle, plugin }
}

/** Владелец, чья открытость сообщается своим событием, а не `change:open`. */
class TToggleOwner {
	readonly events = new TEvented<{ toggle: () => void }>()
	open = false

	toggle(): void {
		this.open = !this.open
		this.events.emit('toggle')
	}
}

describe('подписка на открытость — с принятия набора', () => {
	it('до принятия смена открытости onChange не зовёт, принятие отдаёт текущую', () => {
		const owner = new TPopover()
		const { bundle, plugin } = mount(owner)

		owner.open = true

		expect(plugin.changes).toEqual([])

		bundle.attach()
		owner.open = false

		expect(plugin.changes).toEqual([true, false])
	})

	it('sync отдаёт открытость, какая она сейчас', () => {
		const owner = new TPopover()
		const { plugin } = mount(owner)

		owner.open = true
		plugin.open?.sync()

		expect(plugin.changes).toEqual([true])
	})
})

describe('снятие привязки', () => {
	it('уничтожение набора снимает подписку: смена открытости onChange не зовёт', () => {
		const owner = new TPopover()
		const { bundle, plugin } = mount(owner)

		bundle.attach()
		owner.open = true
		bundle.destroy()
		owner.open = false

		expect(plugin.changes).toEqual([false, true])
	})

	it('снимается только своя подписка: соседняя привязка на том же владельце работает', () => {
		const owner = new TPopover()
		const unbound = mount(owner)
		const kept = mount(owner)

		unbound.bundle.attach()
		kept.bundle.attach()
		unbound.bundle.destroy()
		owner.open = true

		expect(unbound.plugin.changes).toEqual([false])
		expect(kept.plugin.changes).toEqual([false, true])
	})

	it('подписка на своё событие открытости (`event`) снимается так же', () => {
		const owner = new TToggleOwner()
		const { bundle, plugin } = mount(owner, { event: 'toggle' })

		bundle.attach()
		owner.toggle()
		bundle.destroy()
		owner.toggle()

		expect(plugin.changes).toEqual([false, true])
	})
})
