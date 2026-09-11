// @vitest-environment jsdom

/**
 * TTabsContentWarnPlugin — диагностика неверного слота.
 *
 * `Tabs.Content` обязан попадать в слот `content`, а не в `default` (тот
 * рендерится внутри `[role="tablist"]`). Перепутанный слот раньше был виден
 * только глазами; теперь плагин предупреждает в консоль, найдя DOM-узел
 * панели внутри списка табов.
 */

import { describe, it, expect, vi, afterEach } from 'vitest'
import { TElementPlugin, TTabsContentWarnPlugin } from '../src'
import type { IPluginContext } from '../src'

function contextFor(elementPlugin: TElementPlugin): IPluginContext {
	return {
		get: ((ctor) =>
			ctor === TElementPlugin ? elementPlugin : undefined) as IPluginContext['get'],
		getInstance: () => null,
	}
}

afterEach(() => {
	document.body.innerHTML = ''
	vi.restoreAllMocks()
})

describe('TTabsContentWarnPlugin — панель внутри [role="tablist"]', () => {
	it('печатает предупреждение, когда узел уже готов', () => {
		const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
		const tablist = document.createElement('div')

		tablist.setAttribute('role', 'tablist')
		document.body.appendChild(tablist)

		const elementPlugin = new TElementPlugin()
		const panel = document.createElement('div')

		tablist.appendChild(panel)
		elementPlugin.element = panel

		new TTabsContentWarnPlugin().install(contextFor(elementPlugin))

		expect(warn).toHaveBeenCalledTimes(1)
		expect(warn.mock.calls[0][0]).toContain('[role="tablist"]')
	})

	it('молчит, когда панель снаружи tablist', () => {
		const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
		const elementPlugin = new TElementPlugin()
		const panel = document.createElement('div')

		document.body.appendChild(panel)
		elementPlugin.element = panel

		new TTabsContentWarnPlugin().install(contextFor(elementPlugin))

		expect(warn).not.toHaveBeenCalled()
	})

	it('узел приходит кадром позже (rAF) — проверка ждёт ready, а не nextTick', async () => {
		const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
		const tablist = document.createElement('div')

		tablist.setAttribute('role', 'tablist')
		document.body.appendChild(tablist)

		const elementPlugin = new TElementPlugin()

		new TTabsContentWarnPlugin().install(contextFor(elementPlugin))

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

		expect(() => new TTabsContentWarnPlugin().install(contextFor(elementPlugin))).not.toThrow()

		expect(warn).not.toHaveBeenCalled()
	})

	it('нет TElementPlugin в bundle — не бросает и не предупреждает', () => {
		const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
		const ctx: IPluginContext = { get: () => undefined, getInstance: () => null }

		expect(() => new TTabsContentWarnPlugin().install(ctx)).not.toThrow()

		expect(warn).not.toHaveBeenCalled()
	})
})
