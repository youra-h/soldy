// @vitest-environment jsdom

/**
 * TActionPlugin — `data-focus-visible`.
 *
 * Браузер сам матчит `:focus-visible` на текстовом поле при любом фокусе,
 * включая клик мышью (спека считает поле «ожидающим клавиатуру»). Плагин
 * считает модальность сам: keydown перед фокусом — клавиатура, pointerdown —
 * указатель, и пишет результат в `dataset`, а не полагается на CSS.
 */

import { describe, it, expect, afterEach } from 'vitest'
import { TActionPlugin, TElementPlugin } from '../src'
import type { IPluginContext } from '../src'
import { TDataset } from '@soldy/core'

function instanceWith(dataset: TDataset) {
	return {
		uid: 'x',
		disabled: false,
		focused: false,
		dataset,
		events: { on: () => {}, off: () => {} },
	}
}

function contextFor(elementPlugin: TElementPlugin, instance: ReturnType<typeof instanceWith>): IPluginContext {
	return {
		get: ((ctor) =>
			ctor === TElementPlugin ? elementPlugin : undefined) as IPluginContext['get'],
		getInstance: () => instance as any,
	}
}

async function nextFrame(): Promise<void> {
	await new Promise((resolve) => requestAnimationFrame(resolve))
}

afterEach(() => {
	document.body.innerHTML = ''
})

describe('TActionPlugin — data-focus-visible', () => {
	it('keydown перед фокусом ставит data-focus-visible', async () => {
		const dataset = new TDataset()
		const elementPlugin = new TElementPlugin()
		const el = document.createElement('div')
		const input = document.createElement('input')

		el.appendChild(input)
		document.body.appendChild(el)

		new TActionPlugin().install(contextFor(elementPlugin, instanceWith(dataset)))

		elementPlugin.element = el
		await nextFrame()

		document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Tab', bubbles: true }))
		input.dispatchEvent(new FocusEvent('focusin', { bubbles: true }))

		expect(dataset.toObject()['data-focus-visible']).toBe('true')
	})

	it('pointerdown перед фокусом не ставит data-focus-visible', async () => {
		const dataset = new TDataset()
		const elementPlugin = new TElementPlugin()
		const el = document.createElement('div')
		const input = document.createElement('input')

		el.appendChild(input)
		document.body.appendChild(el)

		new TActionPlugin().install(contextFor(elementPlugin, instanceWith(dataset)))

		elementPlugin.element = el
		await nextFrame()

		document.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true }))
		input.dispatchEvent(new FocusEvent('focusin', { bubbles: true }))

		expect(dataset.toObject()['data-focus-visible']).toBeUndefined()
	})

	it('focusout снимает data-focus-visible', async () => {
		const dataset = new TDataset()
		const elementPlugin = new TElementPlugin()
		const el = document.createElement('div')
		const input = document.createElement('input')

		el.appendChild(input)
		document.body.appendChild(el)

		new TActionPlugin().install(contextFor(elementPlugin, instanceWith(dataset)))

		elementPlugin.element = el
		await nextFrame()

		document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Tab', bubbles: true }))
		input.dispatchEvent(new FocusEvent('focusin', { bubbles: true }))
		expect(dataset.toObject()['data-focus-visible']).toBe('true')

		input.dispatchEvent(new FocusEvent('focusout', { bubbles: true }))
		expect(dataset.toObject()['data-focus-visible']).toBeUndefined()
	})
})
