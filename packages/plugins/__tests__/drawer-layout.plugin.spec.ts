/**
 * TDrawerLayoutPlugin — раскладка выезжающей панели: слой и размер в стили.
 *
 * Расчёт общий с окном (`TModalLayoutPlugin`, см.
 * `dialog-layout.plugin.spec.ts`); здесь — что панель получает его целиком,
 * со своими именами переменных: их читает CSS блока `so-drawer`.
 */

import { describe, it, expect, beforeEach } from 'vitest'
import { TDrawer, TLayer } from '@soldy-ui/core'
import type { IDrawerProps } from '@soldy-ui/core'
import { TDrawerLayoutPlugin, TModalLayoutPlugin, TPluginBundle } from '../src'

beforeEach(() => {
	TLayer.resetZIndexCounter()
})

/** Панель и её раскладка, собранные настоящим набором, — ещё без узла. */
function assemble(props: Partial<IDrawerProps> = {}) {
	const drawer = new TDrawer(props)
	const layout = new TPluginBundle(drawer).use(TDrawerLayoutPlugin).get(TDrawerLayoutPlugin)

	if (!layout) throw new Error('TDrawerLayoutPlugin не установлен в bundle')

	return { drawer, layout }
}

/**
 * Собранная панель с подключённым узлом. Номер слоя открыт только у слоя с
 * узлом: `ready` ставит плагин узла после сборки, здесь — тест.
 */
function setup(props: Partial<IDrawerProps> = {}) {
	const assembled = assemble(props)

	assembled.drawer.ready = true

	return assembled
}

describe('раскладка панели', () => {
	it('расчёт — общий с окном', () => {
		expect(setup().layout).toBeInstanceOf(TModalLayoutPlugin)
	})

	it('размер — переменными панели, незаданный — без переменной', () => {
		expect(setup().layout.styles).toEqual({ 'z-index': 0 })

		const { layout } = setup({ width: 360, height: '40vh' })

		expect(layout.styles).toMatchObject({
			'--so-drawer-width': '360px',
			'--so-drawer-height': '40vh',
		})
		expect(layout.styles).not.toHaveProperty('--so-dialog-width')
	})

	it('смена размера пересчитывает стили, снятый убирает переменную', () => {
		const { drawer, layout } = setup({ width: 360 })

		drawer.width = '24rem'

		expect(layout.styles['--so-drawer-width']).toBe('24rem')

		drawer.width = undefined

		expect(layout.styles).not.toHaveProperty('--so-drawer-width')
	})

	it('показ даёт панели и подложке один z-index — номер её слоя', () => {
		const { drawer, layout } = setup()

		drawer.show()

		expect(drawer.zIndex).toBeGreaterThan(0)
		expect(layout.styles['z-index']).toBe(drawer.zIndex)
		expect(layout.backdropStyles).toEqual({ 'z-index': drawer.zIndex })
	})

	/**
	 * Открытая панель с `contained` есть и в разметке сервера: без узла её
	 * `z-index` — 0, как и в первой отрисовке браузера, а номер даёт узел.
	 */
	it('открытая в контейнере без узла — z-index 0, узел даёт номер слоя', () => {
		const { drawer, layout } = assemble({ visible: true, contained: true })

		expect(layout.styles).toEqual({ 'z-index': 0 })
		expect(layout.backdropStyles).toEqual({ 'z-index': 0 })

		drawer.ready = true

		expect(drawer.zIndex).toBeGreaterThan(0)
		expect(layout.styles['z-index']).toBe(drawer.zIndex)
		expect(layout.backdropStyles).toEqual({ 'z-index': drawer.zIndex })
	})
})
