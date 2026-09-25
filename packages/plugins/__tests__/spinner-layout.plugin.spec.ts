/**
 * TSpinnerLayoutPlugin — толщина кольца спиннера в пользовательское свойство
 * `--spinner-border-width`.
 *
 * Плагин следил только за сменой толщины, и значение, с которым спиннер
 * собрали, до стиля не доходило: в инстанс оно приходит без события —
 * конструктором или готовым `ctrl`. А `'auto'` он отдавал как есть — толщиной
 * рамки `auto`, которой не бывает, — хотя ядро считает её по размеру.
 */

import { describe, it, expect, vi } from 'vitest'
import { TSpinner } from '@soldy-ui/core'
import type { ISpinnerProps } from '@soldy-ui/core'
import { TSpinnerLayoutPlugin, TPluginBundle } from '../src'

/** Спиннер и его раскладка, собранные настоящим набором. */
function setup(props: Partial<ISpinnerProps> = {}) {
	const spinner = new TSpinner(props)
	const layout = new TPluginBundle(spinner).use(TSpinnerLayoutPlugin).get(TSpinnerLayoutPlugin)

	if (!layout) throw new Error('TSpinnerLayoutPlugin не установлен в bundle')

	return { spinner, layout }
}

const borderWidth = (layout: TSpinnerLayoutPlugin) => layout.styles['--spinner-border-width']

describe('толщина с установки', () => {
	it('число из конструктора — в px', () => {
		const { layout } = setup({ borderWidth: 3 })

		expect(layout.styles).toEqual({ '--spinner-border-width': '3px' })
	})

	it('auto считается по размеру: 1px у обычного, 2px у крупных', () => {
		expect(borderWidth(setup().layout)).toBe('1px')
		expect(borderWidth(setup({ size: 'sm' }).layout)).toBe('1px')
		expect(borderWidth(setup({ size: 'xl' }).layout)).toBe('2px')
		expect(borderWidth(setup({ size: '2xl' }).layout)).toBe('2px')
	})
})

describe('смена толщины и размера', () => {
	it('смена толщины пересчитывает стили новым объектом', () => {
		const { spinner, layout } = setup({ borderWidth: 3 })
		const styles = layout.styles
		const change = vi.fn()

		layout.events.on('change:styles', change)
		spinner.borderWidth = 4

		expect(borderWidth(layout)).toBe('4px')
		expect(layout.styles).not.toBe(styles)
		expect(change).toHaveBeenCalledOnce()
		expect(change).toHaveBeenCalledWith(layout.styles)
	})

	it('при auto смена размера меняет толщину', () => {
		const { spinner, layout } = setup()
		const change = vi.fn()

		layout.events.on('change:styles', change)
		spinner.size = 'xl'

		expect(borderWidth(layout)).toBe('2px')
		expect(change).toHaveBeenCalledOnce()

		spinner.size = 'normal'

		expect(borderWidth(layout)).toBe('1px')
		expect(change).toHaveBeenCalledTimes(2)
	})

	it('возврат к auto — снова толщина по размеру', () => {
		const { spinner, layout } = setup({ size: 'xl', borderWidth: 5 })

		spinner.borderWidth = 'auto'

		expect(borderWidth(layout)).toBe('2px')
	})
})

describe('событие — только на смену толщины', () => {
	it('у числовой толщины размер её не меняет, и события нет', () => {
		const { spinner, layout } = setup({ borderWidth: 3 })
		const styles = layout.styles
		const change = vi.fn()

		layout.events.on('change:styles', change)
		spinner.size = 'xl'

		expect(change).not.toHaveBeenCalled()
		expect(layout.styles).toBe(styles)
	})

	it('при auto размер той же толщины события не даёт', () => {
		const { spinner, layout } = setup()
		const change = vi.fn()

		layout.events.on('change:styles', change)
		spinner.size = 'lg'

		expect(borderWidth(layout)).toBe('1px')
		expect(change).not.toHaveBeenCalled()
	})

	it('auto, заменённое той же толщиной числом, — не смена', () => {
		const { spinner, layout } = setup({ size: 'xl' })
		const change = vi.fn()

		layout.events.on('change:styles', change)
		spinner.borderWidth = 2

		expect(borderWidth(layout)).toBe('2px')
		expect(change).not.toHaveBeenCalled()
	})
})
