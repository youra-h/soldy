/**
 * `bindOverlayOpen` — привязка плагина оверлея к открытости владельца.
 *
 * Подписка живёт на шине владельца, а владелец бывает долговечнее плагина:
 * свой `ctrl` приложения переживает перемонтирование, и каждое монтирование
 * ставит ему новый набор. Поэтому привязка снимает подписку сама (`unbind`) —
 * и ровно свою: соседние привязки на том же владельце (плагины одного набора,
 * набор следующего монтирования) продолжают работать.
 *
 * Владелец — `TPopover`: у него есть `open` и шина событий. Своё событие
 * открытости (`event`) проверяется на владельце-заглушке: у классов ядра
 * открытость сообщает `change:open`.
 */

import { describe, it, expect, vi } from 'vitest'
import { TEvented, TPopover } from '@soldy-ui/core'
import { TPluginBundle } from '../src'
import type { IOverlayOpenOptions, IOverlayOpenState, IPluginContext } from '../src'
import { bindOverlayOpen } from '../src/custom/overlay/open-state'

/** Контекст плагина на владельце — тот срез набора, что плагин получает в `install`. */
function contextOf(owner: object): IPluginContext {
	const bundle = new TPluginBundle(owner)

	return { get: bundle.get.bind(bundle), getInstance: bundle.getInstance.bind(bundle) }
}

/** Привязка, которая обязана состояться: без неё дальше проверять нечего. */
function bind(
	owner: object,
	onChange: (open: boolean) => void,
	options?: IOverlayOpenOptions,
): IOverlayOpenState {
	const open = bindOverlayOpen(contextOf(owner), options, onChange)

	if (!open) throw new Error('привязки нет: у владельца не объявлено свойство открытости')

	return open
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

describe('снятие привязки', () => {
	it('после unbind смена открытости onChange не зовёт', () => {
		const owner = new TPopover()
		const onChange = vi.fn()
		const open = bind(owner, onChange)

		owner.open = true
		open.unbind()
		owner.open = false

		expect(onChange.mock.calls).toEqual([[true]])
	})

	it('снимается только своя подписка: соседняя привязка на том же владельце работает', () => {
		const owner = new TPopover()
		const unbound = vi.fn()
		const kept = vi.fn()
		const open = bind(owner, unbound)

		bind(owner, kept)
		open.unbind()
		owner.open = true

		expect(unbound).not.toHaveBeenCalled()
		expect(kept.mock.calls).toEqual([[true]])
	})

	it('подписка на своё событие открытости (`event`) снимается тем же unbind', () => {
		const owner = new TToggleOwner()
		const onChange = vi.fn()
		const open = bind(owner, onChange, { event: 'toggle' })

		owner.toggle()
		open.unbind()
		owner.toggle()

		expect(onChange.mock.calls).toEqual([[true]])
	})
})
