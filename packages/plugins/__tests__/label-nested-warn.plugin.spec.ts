// @vitest-environment jsdom

/**
 * TLabelNestedWarnPlugin — диагностика вложенного `label`.
 *
 * HTML запрещает `label` внутри `label`, а корень радио — `label`: радио,
 * положенное в подпись без `tag="span"`, выглядит правильно и ломает разметку
 * молча. Плагин предупреждает в консоль, найдя другой `label` внутри корня
 * подписи.
 */

import { describe, it, expect, vi, afterEach } from 'vitest'
import { TElementPlugin, TLabelNestedWarnPlugin, TPluginBundle } from '../src'

/**
 * Bundle подписи с установленным `TElementPlugin` и сам плагин узла.
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

/** Корень подписи с тегом `tag` и содержимым `inner` в документе. */
function root(tag: string, inner: string): Element {
	const element = document.createElement(tag)

	element.innerHTML = inner
	document.body.appendChild(element)

	return element
}

/** Радио без `tag="span"`: его корень — тоже `label`. */
const NESTED_RADIO = '<span><label><input type="radio" /></label></span><span>Текст</span>'

afterEach(() => {
	document.body.innerHTML = ''
	vi.restoreAllMocks()
})

describe('TLabelNestedWarnPlugin — label внутри label', () => {
	it('печатает одно предупреждение, когда узел уже готов', () => {
		const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
		const { bundle, elementPlugin } = bundleWithElement()

		elementPlugin.element = root('label', NESTED_RADIO)

		bundle.use(TLabelNestedWarnPlugin)

		expect(warn).toHaveBeenCalledTimes(1)
		expect(warn.mock.calls[0][0]).toContain('tag="span"')
	})

	it('молчит, когда внутри подписи нет другого label', () => {
		const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
		const { bundle, elementPlugin } = bundleWithElement()

		elementPlugin.element = root(
			'label',
			'<span><span><input type="radio" /></span></span><span>Текст</span>',
		)

		bundle.use(TLabelNestedWarnPlugin)

		expect(warn).not.toHaveBeenCalled()
	})

	/** Корень не `label` — вкладывать нечего: другой тег задал потребитель. */
	it('молчит, когда корень подписи — не label', () => {
		const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
		const { bundle, elementPlugin } = bundleWithElement()

		elementPlugin.element = root('span', NESTED_RADIO)

		bundle.use(TLabelNestedWarnPlugin)

		expect(warn).not.toHaveBeenCalled()
	})

	it('узел приходит кадром позже (rAF) — проверка ждёт ready, а не nextTick', async () => {
		const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
		const { bundle, elementPlugin } = bundleWithElement()

		bundle.use(TLabelNestedWarnPlugin)

		expect(warn).not.toHaveBeenCalled()

		elementPlugin.element = root('label', NESTED_RADIO)

		await new Promise((resolve) => requestAnimationFrame(resolve))

		expect(warn).toHaveBeenCalledTimes(1)
	})

	it('нет элемента (SSR) — не бросает и не предупреждает', () => {
		const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
		const { bundle } = bundleWithElement()

		expect(() => bundle.use(TLabelNestedWarnPlugin)).not.toThrow()

		expect(warn).not.toHaveBeenCalled()
	})

	it('нет TElementPlugin в bundle — не бросает и не предупреждает', () => {
		const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
		const bundle = new TPluginBundle({})

		expect(() => bundle.use(TLabelNestedWarnPlugin)).not.toThrow()

		expect(warn).not.toHaveBeenCalled()
	})
})
