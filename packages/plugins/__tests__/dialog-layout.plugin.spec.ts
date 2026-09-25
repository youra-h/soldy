/**
 * TDialogLayoutPlugin — раскладка модального окна: слой, размер и отступ в
 * стили.
 *
 * Место и разворот раскладывает тема по модификатору и `data-maximized`, и
 * плагину до них дела нет. Здесь — то, что в класс не уложить: `z-index`
 * слоя у панели и подложки, размер и отступ от краёв экрана переменными,
 * которые тема читает с запасным значением, и событие, в котором подписчик
 * правит стороны отступа по отдельности.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { TDialog, TLayer } from '@soldy-ui/core'
import type { IDialogProps } from '@soldy-ui/core'
import { TDialogLayoutPlugin, TDialogOffsetEvent, TPluginBundle } from '../src'

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

/** Переменные отступа в стилях панели — по стороне. */
const offsets = (styles: Record<string, string | number>) => ({
	top: styles['--dialog-offset-top'],
	bottom: styles['--dialog-offset-bottom'],
	start: styles['--dialog-offset-start'],
	end: styles['--dialog-offset-end'],
})

describe('отступ', () => {
	it('не задан — переменных нет: отступ даёт тема', () => {
		const { layout } = setup()

		expect(layout.styles).toEqual({ 'z-index': 0 })
	})

	it('число — px на все стороны', () => {
		const { layout } = setup({ offset: 24 })

		expect(offsets(layout.styles)).toEqual({
			top: '24px',
			bottom: '24px',
			start: '24px',
			end: '24px',
		})
	})

	it('строка — как есть: проценты раскладывает тема', () => {
		const { layout } = setup({ offset: '5%' })

		expect(offsets(layout.styles)).toEqual({ top: '5%', bottom: '5%', start: '5%', end: '5%' })
	})

	it('0 — вплотную: переменная есть, а не пропала', () => {
		const { layout } = setup({ offset: 0 })

		expect(offsets(layout.styles)).toEqual({
			top: '0px',
			bottom: '0px',
			start: '0px',
			end: '0px',
		})
	})

	it('отступ инлайном не пишется — ни inset, ни поля', () => {
		const { layout } = setup({ offset: 24 })

		for (const key of Object.keys(layout.styles)) {
			expect(key === 'z-index' || key.startsWith('--dialog-')).toBe(true)
		}
	})

	it('смена отступа пересчитывает стили, снятый убирает переменные', () => {
		const { dialog, layout } = setup({ offset: 24 })

		dialog.offset = '2rem'

		expect(layout.styles['--dialog-offset-top']).toBe('2rem')

		dialog.offset = undefined

		expect(layout.styles).toEqual({ 'z-index': 0 })
	})

	describe('событие offset:before', () => {
		it('несёт место и отступ пропа на всех сторонах', () => {
			const { layout } = setup({ offset: 24, placement: 'start' })
			const seen: TDialogOffsetEvent[] = []

			layout.events.on('offset:before', (event) => seen.push(event))
			layout.created()

			expect(seen).toHaveLength(1)
			expect(seen[0]).toBeInstanceOf(TDialogOffsetEvent)
			expect(seen[0]).toMatchObject({
				placement: 'start',
				top: 24,
				bottom: 24,
				start: 24,
				end: 24,
			})
		})

		it('стороны без пропа — undefined: отступ темы', () => {
			const { layout } = setup()
			const seen: TDialogOffsetEvent[] = []

			layout.events.on('offset:before', (event) => seen.push(event))
			layout.created()

			expect(seen[0]).toMatchObject({
				top: undefined,
				bottom: undefined,
				start: undefined,
				end: undefined,
			})
		})

		it('подписчик правит сторону: сверху больше, чем снизу', () => {
			const { layout } = setup({ offset: 24 })

			layout.events.on('offset:before', (event) => {
				event.top = '10%'
			})
			layout.created()

			expect(offsets(layout.styles)).toEqual({
				top: '10%',
				bottom: '24px',
				start: '24px',
				end: '24px',
			})
		})

		it('сторона без значения переменной не даёт: у неё отступ темы', () => {
			const { layout } = setup({ offset: 24 })

			layout.events.on('offset:before', (event) => {
				event.bottom = undefined
			})
			layout.created()

			expect(layout.styles).not.toHaveProperty('--dialog-offset-bottom')
			expect(layout.styles['--dialog-offset-top']).toBe('24px')
		})

		it('подписчик задаёт сторону и без пропа', () => {
			const { layout } = setup()

			layout.events.on('offset:before', (event) => {
				event.top = 0
			})
			layout.created()

			expect(offsets(layout.styles)).toEqual({
				top: '0px',
				bottom: undefined,
				start: undefined,
				end: undefined,
			})
		})

		it('preventDefault — ни одной переменной: все стороны от темы', () => {
			const { layout } = setup({ offset: 24 })

			layout.events.on('offset:before', (event) => {
				event.top = 80
				event.preventDefault()
			})
			layout.created()

			expect(layout.styles).toEqual({ 'z-index': 0 })
		})

		it('поправка держится: каждый пересчёт спрашивает заново', () => {
			const { dialog, layout } = setup({ offset: 24 })

			layout.events.on('offset:before', (event) => {
				event.top = 80
			})
			layout.created()

			dialog.show()

			expect(layout.styles['--dialog-offset-top']).toBe('80px')

			dialog.width = 480

			expect(layout.styles['--dialog-offset-top']).toBe('80px')
			expect(layout.styles['--dialog-width']).toBe('480px')
		})

		it.each<[string, (dialog: TDialog) => void]>([
			['смена отступа', (dialog) => (dialog.offset = 32)],
			['смена места', (dialog) => (dialog.placement = 'top')],
			['показ — смена слоя', (dialog) => dialog.show()],
			['смена размера', (dialog) => (dialog.height = 320)],
		])('%s пересчитывает стили и шлёт событие', (_, change) => {
			const { dialog, layout } = setup({ offset: 24 })
			const handler = vi.fn()

			layout.events.on('offset:before', handler)
			change(dialog)

			expect(handler).toHaveBeenCalledOnce()
		})

		it('место приходит в событии текущим: по нему подписчик выбирает сторону', () => {
			const { dialog, layout } = setup({ offset: 24 })

			layout.events.on('offset:before', (event) => {
				if (event.placement === 'top') event.top = 0
			})

			dialog.placement = 'top'

			expect(layout.styles['--dialog-offset-top']).toBe('0px')

			dialog.placement = 'center'

			expect(layout.styles['--dialog-offset-top']).toBe('24px')
		})
	})

	describe('created() — подписчики появились', () => {
		it('пересчитывает стили с поправкой: окну, созданному видимым, показа уже не будет', () => {
			const { dialog, layout } = setup({ visible: true, offset: 24 })
			const change = vi.fn()

			layout.events.on('offset:before', (event) => {
				event.top = 80
			})
			layout.events.on('change:styles', change)
			layout.created()

			expect(change).toHaveBeenCalledOnce()
			expect(layout.styles).toMatchObject({
				'z-index': dialog.zIndex,
				'--dialog-offset-top': '80px',
			})
		})

		it('без поправки стили те же: change:styles нет, объект прежний', () => {
			const { layout } = setup({ offset: 24 })
			const styles = layout.styles
			const change = vi.fn()

			layout.events.on('change:styles', change)
			layout.created()

			expect(change).not.toHaveBeenCalled()
			expect(layout.styles).toBe(styles)
		})

		it('объявляет плагин раньше пересчёта: подписчик create успевает к событию', () => {
			const { layout } = setup({ offset: 24 })

			layout.events.on('create', () => {
				layout.events.on('offset:before', (event) => {
					event.end = 0
				})
			})
			layout.created()

			expect(layout.styles['--dialog-offset-end']).toBe('0px')
		})
	})

	it('отступ — в стилях с установки: с первого расчёта, до created()', () => {
		const { layout } = setup({ offset: 16 })

		expect(layout.styles['--dialog-offset-start']).toBe('16px')
	})

	it('после destroy отступ больше не пересчитывается и событие не шлётся', () => {
		const { dialog, layout } = setup({ offset: 24 })
		const styles = layout.styles
		const handler = vi.fn()

		layout.events.on('offset:before', handler)
		layout.destroy()
		dialog.offset = 32
		dialog.placement = 'top'

		expect(handler).not.toHaveBeenCalled()
		expect(layout.styles).toBe(styles)
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
