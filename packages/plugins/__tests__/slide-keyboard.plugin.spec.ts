// @vitest-environment jsdom

/**
 * TSlideKeyboardPlugin — клавиши и жест скринридера у полей ручек.
 *
 * Разметку тест строит сам — корень, дорожка и ручки с полями, как их рисует
 * Vue, — а плагины собраны настоящим набором с настоящим `TSlider`. Что
 * нативный сдвиг поля действительно отменён, jsdom не покажет: он клавиш не
 * выполняет. Это проверяет браузер (`playground/vue/browser/slider.spec.ts`).
 */

import { describe, it, expect, afterEach } from 'vitest'
import { TSlider } from '@soldy-ui/core'
import type { ISliderProps } from '@soldy-ui/core'
import { TElementPlugin, TPluginBundle, TSlideKeyboardPlugin } from '../src'
import type { IPlugin, IPluginConstructor } from '../src'

const nextFrame = () => new Promise((resolve) => requestAnimationFrame(resolve))

/** Плагин, который тест поставил сам: без него дальше проверять нечего. */
function pluginOf<P extends IPlugin<any, any>>(
	bundle: TPluginBundle,
	ctor: IPluginConstructor<any, any, P>,
): P {
	const plugin = bundle.get(ctor)

	if (!plugin) throw new Error(`${ctor.name} не установлен в bundle`)

	return plugin
}

const bundles: TPluginBundle[] = []

afterEach(() => {
	for (const bundle of bundles.splice(0)) bundle.destroy()

	document.body.innerHTML = ''
})

/**
 * Ползунок на странице: корень, дорожка и по ручке с полем на значение. Поля
 * получают ход, шаг и значение ручек — как их раскладывает разметка.
 */
async function mount(props: Partial<ISliderProps> = {}, dir: 'ltr' | 'rtl' = 'ltr') {
	const owner = new TSlider(props)
	const bundle = new TPluginBundle(owner).use(TElementPlugin).use(TSlideKeyboardPlugin)

	bundles.push(bundle)

	const root = document.createElement('span')
	const track = document.createElement('span')

	root.dir = dir
	root.className = 's-slider'
	track.className = 's-slider__track'
	root.append(track)

	const fields = owner.thumbs.map((thumb) => {
		const node = document.createElement('span')
		const field = document.createElement('input')
		const slot = document.createElement('button')

		node.className = 's-slider__thumb'
		field.type = 'range'
		field.min = String(thumb.min)
		field.max = String(thumb.max)
		field.step = String(thumb.step)
		field.value = String(thumb.value)
		// Содержимое слота `thumb`: его клавиши — не ручки
		slot.className = 'slot'
		node.append(field, slot)
		track.append(node)

		return field
	})

	document.body.append(root)

	pluginOf(bundle, TElementPlugin).element = root
	await nextFrame()

	/** Клавиша на узле, всплывает до корня. Отдаёт событие — по нему видно, погашено ли. */
	const press = (target: Element, key: string, init: KeyboardEventInit = {}) => {
		const event = new KeyboardEvent('keydown', {
			key,
			bubbles: true,
			cancelable: true,
			...init,
		})

		target.dispatchEvent(event)

		return event
	}

	return { owner, root, fields, press }
}

describe('стрелки — шаг по направлению роста', () => {
	it('LTR: → и ↑ прибавляют, ← и ↓ убавляют; клавиша гасится', async () => {
		const { owner, fields, press } = await mount({ value: 50 })

		const right = press(fields[0], 'ArrowRight')
		expect(owner.value).toBe(51)
		expect(right.defaultPrevented).toBe(true)

		press(fields[0], 'ArrowUp')
		expect(owner.value).toBe(52)

		press(fields[0], 'ArrowLeft')
		press(fields[0], 'ArrowLeft')
		press(fields[0], 'ArrowDown')
		expect(owner.value).toBe(49)
	})

	it('RTL: → убавляет, ← прибавляет — ручка идёт туда, куда смотрит стрелка', async () => {
		const { owner, fields, press } = await mount({ value: 50 }, 'rtl')

		press(fields[0], 'ArrowRight')
		expect(owner.value).toBe(49)

		press(fields[0], 'ArrowLeft')
		press(fields[0], 'ArrowLeft')
		expect(owner.value).toBe(51)
	})

	it('inverted: → убавляет', async () => {
		const { owner, fields, press } = await mount({ value: 50, inverted: true })

		press(fields[0], 'ArrowRight')

		expect(owner.value).toBe(49)
	})

	it('вертикальный сверху вниз: ↓ прибавляет, ↑ убавляет', async () => {
		const { owner, fields, press } = await mount({
			value: 50,
			orientation: 'vertical',
			inverted: true,
		})

		press(fields[0], 'ArrowDown')
		expect(owner.value).toBe(51)

		press(fields[0], 'ArrowUp')
		press(fields[0], 'ArrowUp')
		expect(owner.value).toBe(49)
	})

	it('шаг — шкалы: у списка стрелка ведёт к соседнему элементу', async () => {
		const { owner, fields, press } = await mount({ value: 5, step: [1, 2, 5, 10, 20] })

		press(fields[0], 'ArrowRight')

		expect(owner.value).toBe(10)
	})

	it('клавиша ведёт ручку своего поля', async () => {
		const { owner, fields, press } = await mount({ value: [20, 80] })

		press(fields[1], 'ArrowLeft')

		expect(owner.value).toEqual([20, 79])
	})
})

describe('крупный шаг и края', () => {
	it('Shift со стрелкой, PageUp и PageDown — largeStep шагов', async () => {
		const { owner, fields, press } = await mount({ value: 50, largeStep: 5, step: 2 })

		press(fields[0], 'ArrowRight', { shiftKey: true })
		expect(owner.value).toBe(60)

		press(fields[0], 'PageDown')
		press(fields[0], 'PageDown')
		expect(owner.value).toBe(40)

		press(fields[0], 'PageUp')
		expect(owner.value).toBe(50)
	})

	it('Home и End — край хода ручки: у внутренней — сосед', async () => {
		const { owner, fields, press } = await mount({ value: [20, 50, 80] })

		const end = press(fields[1], 'End')
		expect(owner.value).toEqual([20, 80, 80])
		expect(end.defaultPrevented).toBe(true)

		press(fields[1], 'Home')
		expect(owner.value).toEqual([20, 20, 80])
	})

	it('Home — к min и в RTL, и при inverted', async () => {
		const { owner, fields, press } = await mount({ value: 50, inverted: true }, 'rtl')

		press(fields[0], 'Home')

		expect(owner.value).toBe(0)
	})
})

describe('чужие клавиши не трогаются', () => {
	it.each([
		['Alt+←', 'ArrowLeft', { altKey: true }],
		['Ctrl+→', 'ArrowRight', { ctrlKey: true }],
		['Meta+→', 'ArrowRight', { metaKey: true }],
		['Tab', 'Tab', {}],
		['буква', 'a', {}],
	])('%s', async (_name, key, init) => {
		const { owner, fields, press } = await mount({ value: 50 })

		const event = press(fields[0], key, init)

		expect(owner.value).toBe(50)
		expect(event.defaultPrevented).toBe(false)
	})

	it('клавиши содержимого слота ручки — не ручки', async () => {
		const { owner, root, press } = await mount({ value: 50 })
		const slot = root.querySelector('.slot')

		if (!slot) throw new Error('слота нет')

		const event = press(slot, 'ArrowRight')

		expect(owner.value).toBe(50)
		expect(event.defaultPrevented).toBe(false)
	})
})

/**
 * Мобильный скринридер двигает поле своим жестом и шлёт `input`, а не
 * клавиши. Шаг делает владелец, а поле показывает его значение.
 */
describe('жест скринридера', () => {
	const gesture = (field: HTMLInputElement, value: number) => {
		field.value = String(value)
		field.dispatchEvent(new Event('input', { bubbles: true }))
	}

	/**
	 * Шаг жеста у скринридеров свой — бывает и десятая часть хода. Поле
	 * показывает не его, а шаг владельца.
	 */
	it('правка поля — один шаг владельца в ту же сторону', async () => {
		const { owner, fields } = await mount({ value: 50 })

		gesture(fields[0], 60)
		expect(owner.value).toBe(51)
		expect(fields[0].value).toBe('51')

		gesture(fields[0], 41)
		expect(owner.value).toBe(50)
		expect(fields[0].value).toBe('50')
	})

	it('значение владельца не сменилось — поле возвращается к нему', async () => {
		const { owner, fields } = await mount({ value: [50, 60], minStepsBetweenThumbs: 10 })

		// Правка мимо хода ручки: поле его не держит, держит владелец
		fields[0].max = '100'
		gesture(fields[0], 70)

		expect(owner.value).toEqual([50, 60])
		expect(fields[0].value).toBe('50')
	})

	it('шаг — владельца: у списка — к соседнему элементу', async () => {
		const { owner, fields } = await mount({ value: 5, step: [1, 2, 5, 10, 20] })

		gesture(fields[0], 6)

		expect(owner.value).toBe(10)
		expect(fields[0].value).toBe('10')
	})

	it('commit — после каждого шага жестом', async () => {
		const { owner, fields } = await mount({ value: 50 })
		const commits: unknown[] = []

		owner.events.on('commit', (payload) => commits.push(payload))

		gesture(fields[0], 51)

		expect(commits).toEqual([{ newValue: 51, oldValue: 50 }])
	})
})
