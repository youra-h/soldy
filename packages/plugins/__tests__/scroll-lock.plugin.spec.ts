// @vitest-environment jsdom

/**
 * TScrollLockPlugin — пока владелец открыт, страница под ним не
 * прокручивается.
 *
 * Класса ядра у модального окна ещё нет, и плагину он не нужен: открытость он
 * читает рефлексией по имени свойства. Владельцем в тесте служит `TPopover` —
 * у него есть `open` и шина событий.
 *
 * Проверяется то, ради чего у замка счётчик: слоёв поверх страницы бывает
 * несколько, и закрытие верхнего не должно возвращать прокрутку, пока нижний
 * открыт. Плюс возврат ровно тех инлайновых значений, которые замок перебил,
 * и компенсация полосы прокрутки — раскладки в jsdom нет, поэтому ширину
 * области просмотра тест задаёт сам.
 */

import { describe, it, expect, afterEach } from 'vitest'
import { TPopover } from '@soldy-ui/core'
import { TElementPlugin, TPluginBundle, TScrollLockPlugin } from '../src'
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

/**
 * Наборы, созданные тестом. Замок документа переживает тест — счётчик у него
 * общий, — поэтому набор, оставшийся открытым, обязан быть уничтожен: иначе
 * следующий тест увидит чужой замок.
 */
const bundles: TPluginBundle[] = []

function track(bundle: TPluginBundle): TPluginBundle {
	bundles.push(bundle)

	return bundle
}

/** Слой поверх страницы: владелец, его корень и набор с замком. */
async function layer() {
	const owner = new TPopover()
	const root = document.createElement('div')

	document.body.appendChild(root)

	const bundle = track(new TPluginBundle(owner).use(TElementPlugin).use(TScrollLockPlugin))

	pluginOf(bundle, TElementPlugin).element = root
	await nextFrame()

	return { owner, root, bundle, plugin: pluginOf(bundle, TScrollLockPlugin) }
}

const overflows = () => ({
	root: document.documentElement.style.overflow,
	body: document.body.style.overflow,
})

/** Область просмотра с полосой прокрутки: в jsdom раскладки нет, задаём сами. */
function stubViewport(viewport: number, window_: number): void {
	Object.defineProperty(document.documentElement, 'clientWidth', {
		value: viewport,
		configurable: true,
	})
	Object.defineProperty(window, 'innerWidth', { value: window_, configurable: true })
}

afterEach(() => {
	for (const bundle of bundles.reverse()) bundle.destroy()

	bundles.length = 0

	document.documentElement.removeAttribute('style')
	document.body.removeAttribute('style')
	document.body.innerHTML = ''

	Reflect.deleteProperty(document.documentElement, 'clientWidth')
	Object.defineProperty(window, 'innerWidth', { value: 1024, configurable: true })
})

describe('замок и открытость владельца', () => {
	it('открытие запирает прокрутку, закрытие возвращает', async () => {
		const { owner } = await layer()

		expect(overflows()).toEqual({ root: '', body: '' })

		owner.open = true

		expect(overflows()).toEqual({ root: 'hidden', body: 'hidden' })

		owner.open = false

		expect(overflows()).toEqual({ root: '', body: '' })
	})

	it('заперто и на `html`, и на `body`: кто из них прокручивает страницу, решает она сама', async () => {
		const { owner } = await layer()

		owner.open = true

		expect(document.documentElement.style.overflow).toBe('hidden')
		expect(document.body.style.overflow).toBe('hidden')
	})

	it('без корня запирать негде: замок ложится, как только корень объявлен', async () => {
		const owner = new TPopover()
		const root = document.createElement('div')

		document.body.appendChild(root)

		const bundle = track(new TPluginBundle(owner).use(TElementPlugin).use(TScrollLockPlugin))

		owner.open = true

		expect(overflows()).toEqual({ root: '', body: '' })

		pluginOf(bundle, TElementPlugin).element = root
		await nextFrame()

		expect(overflows()).toEqual({ root: 'hidden', body: 'hidden' })
	})

	it('открытый со старта владелец запирает прокрутку', async () => {
		const owner = new TPopover({ open: true })
		const root = document.createElement('div')

		document.body.appendChild(root)

		const bundle = track(new TPluginBundle(owner).use(TElementPlugin).use(TScrollLockPlugin))

		pluginOf(bundle, TElementPlugin).element = root
		await nextFrame()

		expect(overflows()).toEqual({ root: 'hidden', body: 'hidden' })
	})
})

describe('счётчик слоёв', () => {
	it('два открытых слоя держат замок вместе, закрытие одного его не снимает', async () => {
		const first = await layer()
		const second = await layer()

		first.owner.open = true
		second.owner.open = true

		expect(overflows()).toEqual({ root: 'hidden', body: 'hidden' })

		second.owner.open = false

		expect(overflows()).toEqual({ root: 'hidden', body: 'hidden' })

		first.owner.open = false

		expect(overflows()).toEqual({ root: '', body: '' })
	})

	it('destroy снимает свой счёт, а не весь замок', async () => {
		const first = await layer()
		const second = await layer()

		first.owner.open = true
		second.owner.open = true

		second.bundle.destroy()

		expect(overflows()).toEqual({ root: 'hidden', body: 'hidden' })

		first.bundle.destroy()

		expect(overflows()).toEqual({ root: '', body: '' })
	})

	it('размонтирование корня отпускает замок', async () => {
		const { owner, bundle } = await layer()

		owner.open = true

		pluginOf(bundle, TElementPlugin).element = null

		expect(overflows()).toEqual({ root: '', body: '' })
	})
})

describe('стиль документа', () => {
	it('возвращаются прежние инлайновые значения, а не пустые', async () => {
		document.documentElement.style.overflow = 'auto'
		document.body.style.overflow = 'scroll'

		const { owner } = await layer()

		owner.open = true

		expect(overflows()).toEqual({ root: 'hidden', body: 'hidden' })

		owner.open = false

		expect(overflows()).toEqual({ root: 'auto', body: 'scroll' })
	})

	it('ширина полосы прокрутки компенсируется отступом со стороны конца строки', async () => {
		stubViewport(1000, 1015)

		const { owner } = await layer()

		owner.open = true

		expect(document.body.style.paddingInlineEnd).toBe('15px')

		owner.open = false

		expect(document.body.style.paddingInlineEnd).toBe('')
	})

	it('компенсация прибавляется к отступу, который у страницы уже был', async () => {
		stubViewport(1000, 1015)
		document.body.style.paddingInlineEnd = '10px'

		const { owner } = await layer()

		owner.open = true

		expect(document.body.style.paddingInlineEnd).toBe('25px')

		owner.open = false

		expect(document.body.style.paddingInlineEnd).toBe('10px')
	})

	it('полосы прокрутки нет — компенсировать нечего', async () => {
		stubViewport(1024, 1024)

		const { owner } = await layer()

		owner.open = true

		expect(document.body.style.paddingInlineEnd).toBe('')
	})
})

describe('ручной замок', () => {
	it('без привязки к владельцу замком управляет `enabled`', async () => {
		const owner = new TPopover()
		const root = document.createElement('div')

		document.body.appendChild(root)

		const bundle = track(
			new TPluginBundle(owner).use(TElementPlugin).use(TScrollLockPlugin, { property: null }),
		)

		pluginOf(bundle, TElementPlugin).element = root
		await nextFrame()

		owner.open = true

		expect(overflows()).toEqual({ root: '', body: '' })

		pluginOf(bundle, TScrollLockPlugin).enabled = true

		expect(overflows()).toEqual({ root: 'hidden', body: 'hidden' })

		bundle.destroy()

		expect(overflows()).toEqual({ root: '', body: '' })
	})

	it('смена `enabled` сообщается событием', async () => {
		const { owner, plugin } = await layer()
		const seen: boolean[] = []

		plugin.events.on('change:enabled', (value) => seen.push(value))

		owner.open = true
		owner.open = false

		expect(seen).toEqual([true, false])
	})
})
