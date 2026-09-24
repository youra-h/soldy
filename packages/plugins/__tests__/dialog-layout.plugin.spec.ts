/**
 * TDialogLayoutPlugin — раскладка модального окна: слой и размер в стили.
 *
 * Место и разворот раскладывает тема по модификатору и `data-maximized`, и
 * плагину до них дела нет. Здесь — то, что в класс не уложить: `z-index`
 * слоя у панели и подложки и размер переменными, которые тема читает с
 * запасным значением.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { TDialog, TLayer } from '@soldy-ui/core'
import type { IDialogProps } from '@soldy-ui/core'
import { TDialogLayoutPlugin, TPluginBundle } from '../src'

beforeEach(() => {
	TLayer.resetZIndexCounter()
})

/** Окно и его раскладка, собранные настоящим набором. */
function setup(props: Partial<IDialogProps> = {}) {
	const dialog = new TDialog(props)
	const layout = new TPluginBundle(dialog).use(TDialogLayoutPlugin).get(TDialogLayoutPlugin)

	if (!layout) throw new Error('TDialogLayoutPlugin не установлен в bundle')

	return { dialog, layout }
}

describe('размер', () => {
	it('не задан — переменных нет: размер по умолчанию даёт тема', () => {
		const { layout } = setup()

		expect(layout.styles).toEqual({ 'z-index': 0 })
	})

	it('число — px, строка — как есть', () => {
		const { layout } = setup({ width: 480, height: '60vh' })

		expect(layout.styles).toMatchObject({
			'--dialog-width': '480px',
			'--dialog-height': '60vh',
		})
	})

	it('auto и fit-content уходят теме как есть: что они значат, решает она', () => {
		const { layout } = setup({ width: 'auto', height: 'fit-content' })

		expect(layout.styles['--dialog-width']).toBe('auto')
		expect(layout.styles['--dialog-height']).toBe('fit-content')
	})

	it('смена размера пересчитывает стили, снятый размер убирает переменную', () => {
		const { dialog, layout } = setup({ width: 480 })

		dialog.width = '40rem'

		expect(layout.styles['--dialog-width']).toBe('40rem')

		dialog.width = undefined

		expect(layout.styles).not.toHaveProperty('--dialog-width')
	})

	it('размер инлайном не пишется — только переменной', () => {
		const { layout } = setup({ width: 480, height: 320 })

		expect(layout.styles).not.toHaveProperty('width')
		expect(layout.styles).not.toHaveProperty('height')
	})
})

describe('слой', () => {
	it('показ даёт панели и подложке один z-index — номер слоя окна', () => {
		const { dialog, layout } = setup()

		dialog.show()

		expect(dialog.zIndex).toBeGreaterThan(0)
		expect(layout.styles['z-index']).toBe(dialog.zIndex)
		expect(layout.backdropStyles).toEqual({ 'z-index': dialog.zIndex })
	})

	it('окно, созданное видимым, стоит в своём слое с установки', () => {
		const { dialog, layout } = setup({ visible: true })

		expect(layout.styles['z-index']).toBe(dialog.zIndex)
		expect(layout.backdropStyles['z-index']).toBe(dialog.zIndex)
	})
})

describe('значение, а не ручка на состояние', () => {
	it('объекты стилей заменяются целиком', () => {
		const { dialog, layout } = setup()
		const styles = layout.styles
		const backdrop = layout.backdropStyles

		dialog.show()

		expect(layout.styles).not.toBe(styles)
		expect(layout.backdropStyles).not.toBe(backdrop)
	})

	it('смена размера подложку не трогает', () => {
		const { dialog, layout } = setup()
		const backdrop = vi.fn()

		layout.events.on('change:backdropStyles', backdrop)
		dialog.width = 480

		expect(backdrop).not.toHaveBeenCalled()
	})

	it('после destroy стили больше не пересчитываются', () => {
		const { dialog, layout } = setup()
		const styles = layout.styles

		layout.destroy()
		dialog.width = 480

		expect(layout.styles).toBe(styles)
	})
})
