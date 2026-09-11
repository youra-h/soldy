// @vitest-environment jsdom

/**
 * TTabsContentBindingExtension — диагностика неверного слота.
 *
 * `Tabs.Content` обязан попадать в слот `content`, а не в `default` (тот
 * рендерится внутри `[role="tablist"]`). Перепутанный слот раньше был виден
 * только глазами; теперь связка предупреждает в консоль, найдя DOM-узел
 * панели внутри списка табов.
 */

import { describe, it, expect, vi, afterEach } from 'vitest'
import { TElementPlugin } from '@soldy/plugins'
import {
	TTabsContentBindingExtension,
	type TElevatorFactory,
	type IAdapterContext,
} from '@soldy/setup'

/** Элеватор, отдающий заранее положенный (фиктивный) движок коллекции. */
function elevatorFor(engine: unknown): TElevatorFactory {
	return () => ({
		down: () => {},
		up: () => engine,
	})
}

/** Достаточный для конструктора расширения движок: пустой driver и core. */
function fakeEngine(): any {
	const events = { on: vi.fn(), off: vi.fn() }
	const driver = Object.assign([], { events })

	return {
		driver,
		getCore: () => ({ extensions: {}, driver }),
	}
}

function fakeContent(): any {
	return {
		value: 'a',
		aria: { add: vi.fn(), remove: vi.fn() },
		events: { on: vi.fn(), off: vi.fn() },
	}
}

function fakeContext(elementPlugin: TElementPlugin): IAdapterContext {
	return {
		instance: {},
		bundle: { get: (ctor: unknown) => (ctor === TElementPlugin ? elementPlugin : undefined) },
		accessor: {},
		descriptor: {} as any,
		props: {},
		events: { on: vi.fn(), off: vi.fn(), emit: vi.fn() } as any,
		use: vi.fn(),
		get: vi.fn(),
		destroy: vi.fn(),
	}
}

afterEach(() => {
	document.body.innerHTML = ''
	vi.restoreAllMocks()
})

describe('TTabsContentBindingExtension — панель внутри [role="tablist"]', () => {
	it('печатает предупреждение, когда узел уже готов', () => {
		const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
		const tablist = document.createElement('div')

		tablist.setAttribute('role', 'tablist')
		document.body.appendChild(tablist)

		const elementPlugin = new TElementPlugin()
		const panel = document.createElement('div')

		tablist.appendChild(panel)
		elementPlugin.element = panel

		new TTabsContentBindingExtension(fakeContext(elementPlugin), {
			content: fakeContent(),
			elevator: elevatorFor(fakeEngine()),
		})

		expect(warn).toHaveBeenCalledTimes(1)
		expect(warn.mock.calls[0][0]).toContain('[role="tablist"]')
	})

	it('молчит, когда панель снаружи tablist', () => {
		const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
		const elementPlugin = new TElementPlugin()
		const panel = document.createElement('div')

		document.body.appendChild(panel)
		elementPlugin.element = panel

		new TTabsContentBindingExtension(fakeContext(elementPlugin), {
			content: fakeContent(),
			elevator: elevatorFor(fakeEngine()),
		})

		expect(warn).not.toHaveBeenCalled()
	})

	it('узел приходит кадром позже (rAF) — проверка ждёт ready, а не nextTick', async () => {
		const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
		const tablist = document.createElement('div')

		tablist.setAttribute('role', 'tablist')
		document.body.appendChild(tablist)

		const elementPlugin = new TElementPlugin()

		new TTabsContentBindingExtension(fakeContext(elementPlugin), {
			content: fakeContent(),
			elevator: elevatorFor(fakeEngine()),
		})

		expect(warn).not.toHaveBeenCalled()

		const panel = document.createElement('div')

		tablist.appendChild(panel)
		elementPlugin.element = panel

		await new Promise((resolve) => requestAnimationFrame(resolve))

		expect(warn).toHaveBeenCalledTimes(1)
	})

	it('нет элемента (SSR) — не бросает и не предупреждает', () => {
		const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
		const elementPlugin = new TElementPlugin()

		expect(() =>
			new TTabsContentBindingExtension(fakeContext(elementPlugin), {
				content: fakeContent(),
				elevator: elevatorFor(fakeEngine()),
			}),
		).not.toThrow()

		expect(warn).not.toHaveBeenCalled()
	})
})
