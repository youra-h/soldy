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
import { TElementPlugin, TPluginBundle, TTabsContentWarnPlugin } from '../src'

/**
 * Bundle панели с установленным `TElementPlugin` и сам плагин узла.
 *
 * Узел плагин получает от настоящего bundle, как в рантайме: связь «класс →
 * экземпляр» держит его реестр, а заглушка контекста была бы второй
 * реализацией поиска. Владелец диагностике не нужен — хватает пустого объекта.
 */
function bundleWithElement() {
	const bundle = new TPluginBundle({}).use(TElementPlugin)
	const elementPlugin = bundle.get(TElementPlugin)

	if (!elementPlugin) {
		throw new Error('TElementPlugin не установлен в bundle')
	}

	return { bundle, elementPlugin }
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

		const { bundle, elementPlugin } = bundleWithElement()
		const panel = document.createElement('div')

		tablist.appendChild(panel)
		elementPlugin.element = panel

		bundle.use(TTabsContentWarnPlugin)

		expect(warn).toHaveBeenCalledTimes(1)
		expect(warn.mock.calls[0][0]).toContain('[role="tablist"]')
	})

	it('молчит, когда панель снаружи tablist', () => {
		const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
		const { bundle, elementPlugin } = bundleWithElement()
		const panel = document.createElement('div')

		document.body.appendChild(panel)
		elementPlugin.element = panel

		bundle.use(TTabsContentWarnPlugin)

		expect(warn).not.toHaveBeenCalled()
	})

	it('узел приходит кадром позже (rAF) — проверка ждёт ready, а не nextTick', async () => {
		const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
		const tablist = document.createElement('div')

		tablist.setAttribute('role', 'tablist')
		document.body.appendChild(tablist)

		const { bundle, elementPlugin } = bundleWithElement()

		bundle.use(TTabsContentWarnPlugin)

		expect(warn).not.toHaveBeenCalled()

		const panel = document.createElement('div')

		tablist.appendChild(panel)
		elementPlugin.element = panel

		await new Promise((resolve) => requestAnimationFrame(resolve))

		expect(warn).toHaveBeenCalledTimes(1)
	})

	it('нет элемента (SSR) — не бросает и не предупреждает', () => {
		const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
		const { bundle } = bundleWithElement()

		expect(() => bundle.use(TTabsContentWarnPlugin)).not.toThrow()

		expect(warn).not.toHaveBeenCalled()
	})

	it('нет TElementPlugin в bundle — не бросает и не предупреждает', () => {
		const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
		const bundle = new TPluginBundle({})

		expect(() => bundle.use(TTabsContentWarnPlugin)).not.toThrow()

		expect(warn).not.toHaveBeenCalled()
	})
})
