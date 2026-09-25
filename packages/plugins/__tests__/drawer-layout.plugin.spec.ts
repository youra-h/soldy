/**
 * TDrawerLayoutPlugin — раскладка выезжающей панели: слой и размер в стили.
 *
 * Расчёт общий с окном (`TModalLayoutPlugin`, см.
 * `dialog-layout.plugin.spec.ts`); здесь — что панель получает его целиком,
 * со своими именами переменных: их читает CSS блока `s-drawer`.
 */

import { describe, it, expect, beforeEach } from 'vitest'
import { TDrawer, TLayer } from '@soldy-ui/core'
import type { IDrawerProps } from '@soldy-ui/core'
import { TDrawerLayoutPlugin, TModalLayoutPlugin, TPluginBundle } from '../src'

beforeEach(() => {
	TLayer.resetZIndexCounter()
})

/** Панель и её раскладка, собранные настоящим набором. */
function setup(props: Partial<IDrawerProps> = {}) {
	const drawer = new TDrawer(props)
	const layout = new TPluginBundle(drawer).use(TDrawerLayoutPlugin).get(TDrawerLayoutPlugin)

	if (!layout) throw new Error('TDrawerLayoutPlugin не установлен в bundle')

	return { drawer, layout }
}

describe('раскладка панели', () => {
	it('расчёт — общий с окном', () => {
		expect(setup().layout).toBeInstanceOf(TModalLayoutPlugin)
	})

	it('размер — переменными панели, незаданный — без переменной', () => {
		expect(setup().layout.styles).toEqual({ 'z-index': 0 })

		const { layout } = setup({ width: 360, height: '40vh' })

		expect(layout.styles).toMatchObject({
			'--drawer-width': '360px',
			'--drawer-height': '40vh',
		})
		expect(layout.styles).not.toHaveProperty('--dialog-width')
	})

	it('смена размера пересчитывает стили, снятый убирает переменную', () => {
		const { drawer, layout } = setup({ width: 360 })

		drawer.width = '24rem'

		expect(layout.styles['--drawer-width']).toBe('24rem')

		drawer.width = undefined

		expect(layout.styles).not.toHaveProperty('--drawer-width')
	})

	it('показ даёт панели и подложке один z-index — номер её слоя', () => {
		const { drawer, layout } = setup()

		drawer.show()

		expect(layout.styles['z-index']).toBe(drawer.zIndex)
		expect(layout.backdropStyles).toEqual({ 'z-index': drawer.zIndex })
	})
})
