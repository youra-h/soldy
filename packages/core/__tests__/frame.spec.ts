import { describe, it, expect, beforeEach } from 'vitest'
import { TFrame, TLayer, FRAME_LAYER_ATTRIBUTE } from '@soldy-ui/core'

/**
 * Слой с узлом. Номер места в стеке (`zIndex`, `data-layer`) открыт только у
 * слоя, чей узел подключён: `ready` ему ставит плагин узла, здесь — тест.
 */
function mounted<T extends { ready: boolean }>(layer: T): T {
	layer.ready = true

	return layer
}

describe('TFrame', () => {
	beforeEach(() => {
		TFrame.resetZIndexCounter()
	})

	it('создаётся со значениями по умолчанию', () => {
		const frame = new TFrame()
		expect(frame.x).toBe(0)
		expect(frame.y).toBe(0)
		expect(frame.width).toBe('auto')
		expect(frame.height).toBe('auto')
		expect(frame.visible).toBe(false)
		expect(frame.zIndex).toBe(0)
	})

	it('создаётся с переданными props', () => {
		const frame = new TFrame({ x: 100, y: 200, width: 300, height: 400, visible: true })
		expect(frame.x).toBe(100)
		expect(frame.y).toBe(200)
		expect(frame.width).toBe(300)
		expect(frame.height).toBe(400)
		expect(frame.visible).toBe(true)
	})

	it('создаётся через { props } и через plain props', () => {
		const a = new TFrame({ x: 10, y: 20 })
		expect(a.x).toBe(10)
		expect(a.y).toBe(20)

		const b = new TFrame({ x: 30, y: 40 })
		expect(b.x).toBe(30)
		expect(b.y).toBe(40)
	})

	it('show() делает visible = true и присваивает z-index', () => {
		const frame = mounted(new TFrame())
		expect(frame.visible).toBe(false)
		expect(frame.zIndex).toBe(0)

		frame.show()
		expect(frame.visible).toBe(true)
		expect(frame.zIndex).toBeGreaterThan(0)
	})

	it('hide() делает visible = false', () => {
		const frame = new TFrame({ visible: true })
		expect(frame.visible).toBe(true)

		frame.hide()
		expect(frame.visible).toBe(false)
	})

	it('show() при уже visible не меняет z-index', () => {
		const frame = mounted(new TFrame({ visible: true }))
		frame.show()
		const firstZ = frame.zIndex

		frame.show()
		expect(firstZ).toBeGreaterThan(0)
		expect(frame.zIndex).toBe(firstZ)
	})

	it('hide() при уже hidden не эмитит событий', () => {
		const frame = new TFrame()
		const events: string[] = []
		frame.events.on('hide', () => events.push('hide'))
		frame.events.on('hide:before', () => {
			events.push('hide:before')
			return true
		})

		frame.hide()
		expect(events).toEqual([])
	})

	it('z-index увеличивается с каждым новым show()', () => {
		const frame1 = mounted(new TFrame())
		const frame2 = mounted(new TFrame())

		frame1.show()
		const z1 = frame1.zIndex

		frame2.show()
		const z2 = frame2.zIndex

		expect(z2).toBeGreaterThan(z1)
	})

	it('z-index продолжает расти после hide/show (только инкремент)', () => {
		const frame = mounted(new TFrame())
		frame.show()
		const z1 = frame.zIndex

		frame.hide()
		frame.show()
		const z2 = frame.zIndex

		expect(z2).toBeGreaterThan(z1)
	})

	it('beforeShow может отменить показ', () => {
		const frame = mounted(new TFrame())
		frame.events.on('show:before', (e) => e.preventDefault())

		frame.show()
		expect(frame.visible).toBe(false)
		expect(frame.zIndex).toBe(0)
	})

	it('beforeHide может отменить скрытие', () => {
		const frame = new TFrame({ visible: true })
		frame.events.on('hide:before', (e) => e.preventDefault())

		frame.hide()
		expect(frame.visible).toBe(true)
	})

	it('show/hide эмитят события', () => {
		const frame = new TFrame()
		const log: string[] = []

		frame.events.on('show:before', () => {
			log.push('show:before')
		})
		frame.events.on('show', () => log.push('show'))
		frame.events.on('hide:before', () => {
			log.push('hide:before')
		})
		frame.events.on('hide', () => log.push('hide'))

		frame.show()
		expect(log).toEqual(['show:before', 'show'])

		frame.hide()
		expect(log).toEqual(['show:before', 'show', 'hide:before', 'hide'])
	})

	it('change:visible эмитится при show/hide', () => {
		const frame = new TFrame()
		const values: boolean[] = []
		frame.events.on('change:visible', (v: boolean) => values.push(v))

		frame.show()
		frame.hide()

		expect(values).toEqual([true, false])
	})

	it('change:x / change:y эмитятся при изменении координат', () => {
		const frame = new TFrame()
		const xValues: number[] = []
		const yValues: number[] = []
		frame.events.on('change:x', (v: number) => xValues.push(v))
		frame.events.on('change:y', (v: number) => yValues.push(v))

		frame.x = 100
		frame.y = 200

		expect(xValues).toEqual([100])
		expect(yValues).toEqual([200])
	})

	it('change:width / change:height эмитятся при изменении размеров', () => {
		const frame = new TFrame()
		const widthValues: (number | string)[] = []
		const heightValues: (number | string)[] = []
		frame.events.on('change:width', (v: number | string) => widthValues.push(v))
		frame.events.on('change:height', (v: number | string) => heightValues.push(v))

		frame.width = 500
		frame.height = 300

		expect(widthValues).toEqual([500])
		expect(heightValues).toEqual([300])
	})

	it('change:zIndex эмитится при show()', () => {
		const frame = mounted(new TFrame())
		const zValues: number[] = []
		frame.events.on('change:zIndex', (v: number) => zValues.push(v))

		frame.show()
		expect(zValues.length).toBe(1)
		expect(zValues[0]).toBeGreaterThan(0)
	})

	it('setter visible вызывает show/hide', () => {
		const frame = new TFrame()
		const log: string[] = []
		frame.events.on('show', () => log.push('show'))
		frame.events.on('hide', () => log.push('hide'))

		frame.visible = true
		expect(log).toContain('show')
		expect(frame.visible).toBe(true)

		frame.visible = false
		expect(log).toContain('hide')
		expect(frame.visible).toBe(false)
	})

	/**
	 * Внутри контейнера панель не телепортируется и встаёт в ближайшем
	 * позиционированном предке. Ядро только держит значение и отдаёт его теме;
	 * что из него следует для раскладки и якоря, решают их плагины.
	 */
	it('contained: по умолчанию нет; data-contained для темы; change:contained — на изменение', () => {
		const frame = new TFrame()
		const changes: boolean[] = []

		expect(frame.contained).toBe(false)
		expect(frame.dataset.get('contained')).toBe('false')

		frame.events.on('change:contained', (value) => changes.push(value))
		frame.contained = true
		frame.contained = true

		expect(changes).toEqual([true])
		expect(frame.dataset.get('contained')).toBe('true')
		expect(new TFrame({ contained: true }).dataset.get('contained')).toBe('true')
	})

	it('getProps/toJSON отражают все свойства', () => {
		const frame = new TFrame({
			x: 10,
			y: 20,
			width: 300,
			height: 200,
			visible: true,
			position: 'absolute',
			target: '#portal',
			contained: true,
		})

		const props = frame.getProps()
		expect(props).toMatchObject({
			x: 10,
			y: 20,
			width: 300,
			height: 200,
			visible: true,
			position: 'absolute',
			target: '#portal',
			contained: true,
		})
		expect(frame.toJSON()).toEqual(props)
	})

	/**
	 * Слой — для плагинов оверлея: панели телепортированы в `body` соседями, и
	 * вложенность «список Select в поповере» видна только по номеру слоя.
	 *
	 * Номер открыт только у слоя с узлом: счётчик один на процесс, и номер,
	 * напечатанный в разметке сервера, разошёлся бы с браузером при
	 * гидратации. Место в стеке слой берёт по-прежнему при создании видимым,
	 * показе и `raise()` — узел его только открывает.
	 */
	describe('data-layer', () => {
		it('после show() равен zIndex', () => {
			const frame = mounted(new TFrame())

			frame.show()

			expect(frame.dataset.get(FRAME_LAYER_ATTRIBUTE)).toBe(String(frame.zIndex))
			expect(frame.dataset.toObject()).toHaveProperty('data-layer', String(frame.zIndex))
		})

		it('пока не показан — слоя нет, и с узлом тоже', () => {
			expect(new TFrame().dataset.has(FRAME_LAYER_ATTRIBUTE)).toBe(false)
			expect(mounted(new TFrame()).dataset.has(FRAME_LAYER_ATTRIBUTE)).toBe(false)
			expect(mounted(new TFrame()).zIndex).toBe(0)
		})

		it('повторный show() поднимает слой выше показанных после него', () => {
			const lower = mounted(new TFrame())
			const upper = mounted(new TFrame())

			lower.show()
			upper.show()
			lower.hide()
			lower.show()

			expect(Number(lower.dataset.get(FRAME_LAYER_ATTRIBUTE))).toBeGreaterThan(
				Number(upper.dataset.get(FRAME_LAYER_ATTRIBUTE)),
			)
		})

		/** Так на сервере: узла нет, и номер в разметку не попадает. */
		it('без узла номера нет — и у созданного видимым, и у показанного', () => {
			const open = new TFrame({ visible: true })
			const shown = new TFrame()
			const raised = new TFrame({ visible: true })
			const changes: number[] = []

			for (const frame of [open, shown, raised]) {
				frame.events.on('change:zIndex', (value) => changes.push(value))
			}

			shown.show()
			raised.raise()

			for (const frame of [open, shown, raised]) {
				expect(frame.zIndex).toBe(0)
				expect(frame.dataset.has(FRAME_LAYER_ATTRIBUTE)).toBe(false)
			}

			expect(changes).toEqual([])
		})

		it('подключённый узел открывает номер: zIndex, data-layer и change:zIndex', () => {
			const frame = new TFrame({ visible: true })
			const changes: number[] = []

			frame.events.on('change:zIndex', (value) => changes.push(value))
			frame.ready = true

			expect(frame.zIndex).toBeGreaterThan(0)
			expect(frame.dataset.get(FRAME_LAYER_ATTRIBUTE)).toBe(String(frame.zIndex))
			expect(changes).toEqual([frame.zIndex])
		})

		/**
		 * Место берётся при создании, а не при подключении: порядок привязки
		 * узлов у каждого адаптера свой (бывает, узел потомка привязан раньше
		 * узла предка), и поповер, открытый в окне, встал бы под окно.
		 */
		it('созданные видимыми и подключённые в обратном порядке — выше созданный позже', () => {
			const outer = new TFrame({ visible: true })
			const inner = new TFrame({ visible: true })

			inner.ready = true
			outer.ready = true

			expect(inner.zIndex).toBeGreaterThan(outer.zIndex)
			expect(Number(inner.dataset.get(FRAME_LAYER_ATTRIBUTE))).toBeGreaterThan(
				Number(outer.dataset.get(FRAME_LAYER_ATTRIBUTE)),
			)
		})

		it('снятый узел прячет номер, подключённый снова — возвращает тот же', () => {
			const frame = mounted(new TFrame({ visible: true }))
			const number = frame.zIndex
			const changes: number[] = []

			frame.events.on('change:zIndex', (value) => changes.push(value))
			frame.ready = false

			expect(frame.zIndex).toBe(0)
			expect(frame.dataset.has(FRAME_LAYER_ATTRIBUTE)).toBe(false)

			frame.ready = true

			expect(frame.zIndex).toBe(number)
			expect(frame.dataset.get(FRAME_LAYER_ATTRIBUTE)).toBe(String(number))
			expect(changes).toEqual([0, number])
		})

		it('показ при подключённом узле даёт номер сразу', () => {
			const frame = mounted(new TFrame())
			const changes: number[] = []

			frame.events.on('change:zIndex', (value) => changes.push(value))
			frame.show()

			expect(frame.zIndex).toBeGreaterThan(0)
			expect(frame.dataset.get(FRAME_LAYER_ATTRIBUTE)).toBe(String(frame.zIndex))
			expect(changes).toEqual([frame.zIndex])
		})

		/** По `change:zIndex` разметка перечитывает наборы — номер в них уже стоит. */
		it('номер в data-layer раньше change:zIndex — и при открытии, и при снятии', () => {
			const frame = new TFrame({ visible: true })
			const seen: [number, string | undefined][] = []

			frame.events.on('change:zIndex', (value) =>
				seen.push([value, frame.dataset.get(FRAME_LAYER_ATTRIBUTE)]),
			)
			frame.ready = true
			frame.raise()
			frame.ready = false

			expect(seen).toEqual([
				[1001, '1001'],
				[1002, '1002'],
				[0, undefined],
			])
		})

		it('показанный после созданного видимым — слоем выше', () => {
			const open = mounted(new TFrame({ visible: true }))
			const later = mounted(new TFrame())

			later.show()

			expect(later.zIndex).toBeGreaterThan(open.zIndex)
		})
	})

	/**
	 * Открытость — теме: по `data-open` она проявляет и гасит панель
	 * переходом. Пишет её слой, а не владелец панели: панель телепортирована,
	 * и `data-open` корня владельца до неё не доходит. Проекция `visible`, а
	 * не своё состояние: атрибут идёт за видимостью, как бы её ни меняли.
	 */
	describe('data-open', () => {
		it('у созданного скрытым — false, у созданного видимым — true', () => {
			expect(new TFrame().dataset.get('open')).toBe('false')
			expect(new TFrame({ visible: true }).dataset.get('open')).toBe('true')
		})

		it('идёт за show() и hide()', () => {
			const frame = new TFrame()

			frame.show()

			expect(frame.dataset.get('open')).toBe('true')

			frame.hide()

			expect(frame.dataset.get('open')).toBe('false')
		})

		it('идёт за сеттером visible', () => {
			const frame = new TFrame()

			frame.visible = true

			expect(frame.dataset.toObject()).toHaveProperty('data-open', 'true')

			frame.visible = false

			expect(frame.dataset.toObject()).toHaveProperty('data-open', 'false')
		})

		it('отменённое скрытие data-open не трогает', () => {
			const frame = new TFrame({ visible: true })

			frame.events.on('hide:before', (e) => e.preventDefault())
			frame.hide()

			expect(frame.dataset.get('open')).toBe('true')
		})

		it('смену сообщает change:dataset — по нему адаптер перерисует панель', () => {
			const frame = new TFrame()
			const opens: (string | null)[] = []

			frame.events.on('change:dataset', (value) => opens.push(value['data-open']))

			frame.show()

			expect(opens.at(-1)).toBe('true')

			frame.hide()

			expect(opens.at(-1)).toBe('false')
		})
	})

	it('nextZIndex и resetZIndexCounter работают', () => {
		TFrame.resetZIndexCounter()

		const z1 = TFrame.nextZIndex() // 1000 + 1 = 1001
		const z2 = TFrame.nextZIndex() // 1000 + 2 = 1002
		expect(z2).toBeGreaterThan(z1)

		TFrame.resetZIndexCounter()
		const z3 = TFrame.nextZIndex() // 1000 + 1 = 1001
		expect(z3).toBe(z1)
	})

	/**
	 * Стек один на все слои — Frame и модальное окно, — и база у него одна:
	 * она задаётся у `TLayer`, а не у наследника.
	 */
	it('baseZIndex можно переопределить статически — у TLayer', () => {
		const OriginalBase = TLayer.baseZIndex
		TLayer.baseZIndex = 5000
		TLayer.resetZIndexCounter()

		const frame = mounted(new TFrame())
		frame.show()

		expect(frame.zIndex).toBe(5001)

		TLayer.baseZIndex = OriginalBase
		TLayer.resetZIndexCounter()
	})

	it('width/height принимают строки', () => {
		const frame = new TFrame({ width: '100%', height: 'auto' })
		expect(frame.width).toBe('100%')
		expect(frame.height).toBe('auto')
	})

	it('static create работает', () => {
		const frame = TFrame.create({ x: 50, y: 50 })
		expect(frame).toBeInstanceOf(TFrame)
		expect(frame.x).toBe(50)
		expect(frame.y).toBe(50)
	})

	it('position по умолчанию fixed', () => {
		const frame = new TFrame()
		expect(frame.position).toBe('fixed')
	})

	it('position можно задать при создании', () => {
		const frame = new TFrame({ position: 'absolute' })
		expect(frame.position).toBe('absolute')
	})

	it('position можно изменить через сеттер', () => {
		const frame = new TFrame()
		frame.position = 'absolute'
		expect(frame.position).toBe('absolute')
	})

	it('change:position эмитится при изменении', () => {
		const frame = new TFrame()
		const values: string[] = []
		frame.events.on('change:position', (v: string) => values.push(v))

		frame.position = 'absolute'
		expect(values).toEqual(['absolute'])
	})

	it('target по умолчанию body', () => {
		const frame = new TFrame()
		expect(frame.target).toBe('body')
	})

	it('target можно задать при создании', () => {
		const frame = new TFrame({ target: '#portal' })
		expect(frame.target).toBe('#portal')
	})

	it('target можно изменить через сеттер', () => {
		const frame = new TFrame()
		frame.target = '#my-modal'
		expect(frame.target).toBe('#my-modal')
	})

	it('change:target эмитится при изменении', () => {
		const frame = new TFrame()
		const values: string[] = []
		frame.events.on('change:target', (v: string) => values.push(v))

		frame.target = '#portal'
		expect(values).toEqual(['#portal'])
	})
})
