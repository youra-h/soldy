// @vitest-environment jsdom

/**
 * TScrollLockPlugin — пока владелец открыт, страница под ним не
 * прокручивается.
 *
 * Конкретный класс владельца плагину не нужен: открытость он читает
 * рефлексией по имени свойства. Владельцем в тесте служит `TPopover` — у него
 * есть `open` и шина событий.
 *
 * Проверяется то, ради чего у замка счётчик: слоёв поверх страницы бывает
 * несколько, и закрытие верхнего не должно возвращать прокрутку, пока нижний
 * открыт. Плюс возврат ровно тех инлайновых значений, которые замок перебил,
 * и компенсация полосы прокрутки — раскладки в jsdom нет, поэтому ширину
 * области просмотра тест задаёт сам.
 *
 * Закрытие отпускает замок не сразу, а когда корень доиграл переходы
 * закрытия. Web Animations jsdom не знает: без переходов замок уходит кадром
 * позже, а сами переходы корня тест подставляет сам (`stubTransitions`).
 * Как это выглядит на экране — `playground/vue/browser/dialog.spec.ts` и
 * `drawer.spec.ts`, «прокрутка страницы».
 */

import { describe, it, expect, afterEach } from 'vitest'
import { TPopover } from '@soldy-ui/core'
import { TElementPlugin, TPluginBundle, TScrollLockPlugin } from '../src'
import type { IPlugin, IPluginConstructor } from '../src'

const nextFrame = () => new Promise((resolve) => requestAnimationFrame(resolve))

/** Все микрозадачи позади: цепочка ожидания `finished` отработала. */
const flush = () => new Promise((resolve) => setTimeout(resolve, 0))

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

const LOCKED = { root: 'hidden', body: 'hidden' }
const FREE = { root: '', body: '' }

/** Область просмотра с полосой прокрутки: в jsdom раскладки нет, задаём сами. */
function stubViewport(viewport: number, window_: number): void {
	Object.defineProperty(document.documentElement, 'clientWidth', {
		value: viewport,
		configurable: true,
	})
	Object.defineProperty(window, 'innerWidth', { value: window_, configurable: true })
}

/**
 * CSS-переход, как его отдаёт `getAnimations()`. Кончает его тест:
 * `finish()` — доиграл, `abort()` — отменён (`finished` отклонён с
 * `AbortError`, как у перебитого перехода).
 */
class TProbeTransition {
	readonly finished: Promise<TProbeTransition>
	finish: () => void = () => {}
	abort: () => void = () => {}

	constructor() {
		this.finished = new Promise((resolve, reject) => {
			this.finish = () => resolve(this)
			this.abort = () => reject(new DOMException('Переход отменён', 'AbortError'))
		})
	}
}

/** Бесконечная CSS-анимация: `finished` у неё не наступает никогда. */
class TProbeAnimation {
	readonly finished = new Promise<never>(() => {})
}

/**
 * Web Animations у окна и корня: класс перехода — в окне, как у браузера, а
 * анимации корня отдаёт `current()` на каждый вызов. С `subtree` к ним
 * добавляются анимации детей (`subtree()`) — так их отдаёт браузер.
 */
function stubTransitions(
	root: Element,
	current: () => object[],
	subtree: () => object[] = () => [],
): void {
	Object.defineProperty(window, 'CSSTransition', { value: TProbeTransition, configurable: true })
	Object.defineProperty(root, 'getAnimations', {
		value: (options?: { subtree?: boolean }) =>
			options?.subtree ? [...current(), ...subtree()] : current(),
		configurable: true,
	})
}

afterEach(() => {
	for (const bundle of bundles.reverse()) bundle.destroy()

	bundles.length = 0

	document.documentElement.removeAttribute('style')
	document.body.removeAttribute('style')
	document.body.innerHTML = ''

	Reflect.deleteProperty(document.documentElement, 'clientWidth')
	Reflect.deleteProperty(window, 'CSSTransition')
	Object.defineProperty(window, 'innerWidth', { value: 1024, configurable: true })
})

describe('замок и открытость владельца', () => {
	it('открытие запирает прокрутку, закрытие возвращает', async () => {
		const { owner } = await layer()

		expect(overflows()).toEqual(FREE)

		owner.open = true

		expect(overflows()).toEqual(LOCKED)

		owner.open = false
		await nextFrame()

		expect(overflows()).toEqual(FREE)
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

		expect(overflows()).toEqual(FREE)

		pluginOf(bundle, TElementPlugin).element = root
		await nextFrame()

		expect(overflows()).toEqual(LOCKED)
	})

	it('открытый со старта владелец запирает прокрутку', async () => {
		const owner = new TPopover({ open: true })
		const root = document.createElement('div')

		document.body.appendChild(root)

		const bundle = track(new TPluginBundle(owner).use(TElementPlugin).use(TScrollLockPlugin))

		pluginOf(bundle, TElementPlugin).element = root
		await nextFrame()

		expect(overflows()).toEqual(LOCKED)
	})
})

describe('счётчик слоёв', () => {
	it('два открытых слоя держат замок вместе, закрытие одного его не снимает', async () => {
		const first = await layer()
		const second = await layer()

		first.owner.open = true
		second.owner.open = true

		expect(overflows()).toEqual(LOCKED)

		second.owner.open = false
		await nextFrame()

		expect(overflows()).toEqual(LOCKED)

		first.owner.open = false
		await nextFrame()

		expect(overflows()).toEqual(FREE)
	})

	it('destroy снимает свой счёт, а не весь замок', async () => {
		const first = await layer()
		const second = await layer()

		first.owner.open = true
		second.owner.open = true

		second.bundle.destroy()

		expect(overflows()).toEqual(LOCKED)

		first.bundle.destroy()

		expect(overflows()).toEqual(FREE)
	})

	it('размонтирование корня отпускает замок', async () => {
		const { owner, bundle } = await layer()

		owner.open = true

		pluginOf(bundle, TElementPlugin).element = null

		expect(overflows()).toEqual(FREE)
	})
})

/**
 * Закрытая панель ещё на экране: гаснет или уезжает переходом темы. Верни
 * замок сразу — полоса прокрутки сузила бы область просмотра, и панель
 * переехала бы вбок, пока исчезает. Поэтому свой счёт плагин отдаёт, когда
 * корень доиграл переходы закрытия, — а их он смотрит кадром позже: к нему
 * адаптер уже перерисовал разметку.
 */
describe('закрытие — после перехода', () => {
	it('закрытие не отпускает замок сразу: без переходов — кадром позже', async () => {
		const { owner } = await layer()

		owner.open = true
		owner.open = false

		expect(overflows()).toEqual(LOCKED)

		await nextFrame()

		expect(overflows()).toEqual(FREE)
	})

	it('переход корня держит замок, пока не доиграет', async () => {
		const { owner, root } = await layer()
		const transition = new TProbeTransition()

		owner.open = true
		stubTransitions(root, () => [transition])
		owner.open = false
		await nextFrame()
		await flush()

		expect(overflows()).toEqual(LOCKED)

		transition.finish()
		await flush()

		expect(overflows()).toEqual(FREE)
	})

	it('ждёт все переходы корня, а не первый', async () => {
		const { owner, root } = await layer()
		const opacity = new TProbeTransition()
		const display = new TProbeTransition()

		owner.open = true
		stubTransitions(root, () => [opacity, display])
		owner.open = false
		await nextFrame()

		opacity.finish()
		await flush()

		expect(overflows()).toEqual(LOCKED)

		display.finish()
		await flush()

		expect(overflows()).toEqual(FREE)
	})

	/**
	 * Переход отменяют, когда корень сняли или перебили обратным переходом:
	 * `finished` отклоняется. Для замка это тоже конец, а отклонение не уходит
	 * в `unhandledrejection` — на нём упал бы сам прогон.
	 */
	it('отменённый переход — тоже конец', async () => {
		const { owner, root } = await layer()
		const transition = new TProbeTransition()

		owner.open = true
		stubTransitions(root, () => [transition])
		owner.open = false
		await nextFrame()

		transition.abort()
		await flush()

		expect(overflows()).toEqual(FREE)
	})

	it('CSS-анимация корня замок не держит: у бесконечной конца нет', async () => {
		const { owner, root } = await layer()

		owner.open = true
		stubTransitions(root, () => [new TProbeAnimation()])
		owner.open = false
		await nextFrame()

		expect(overflows()).toEqual(FREE)
	})

	it('переходы детей замок не держат: исчезанию они не принадлежат', async () => {
		const { owner, root } = await layer()

		owner.open = true
		stubTransitions(
			root,
			() => [],
			() => [new TProbeTransition()],
		)
		owner.open = false
		await nextFrame()

		expect(overflows()).toEqual(FREE)
	})

	it('открыли снова до кадра — замок лежит, и одно следующее закрытие его снимает', async () => {
		const { owner } = await layer()

		owner.open = true
		owner.open = false
		owner.open = true
		await nextFrame()

		expect(overflows()).toEqual(LOCKED)

		owner.open = false
		await nextFrame()

		expect(overflows()).toEqual(FREE)
	})

	/**
	 * Ожидание, отменённое повторным открытием, кончается потом — когда
	 * перебитый переход отклонят. Замка оно уже не касается: панель, закрытая
	 * снова, ещё уезжает.
	 */
	it('открыли снова во время перехода — отменённое ожидание замок не отпускает', async () => {
		const { owner, root } = await layer()
		const leaving = new TProbeTransition()
		const again = new TProbeTransition()
		let current = [leaving]

		owner.open = true
		stubTransitions(root, () => current)
		owner.open = false
		await nextFrame()

		owner.open = true
		current = [again]
		owner.open = false
		await nextFrame()

		leaving.abort()
		await flush()

		expect(overflows()).toEqual(LOCKED)

		again.finish()
		await flush()

		expect(overflows()).toEqual(FREE)
	})

	it('два слоя: верхний закрыли, открыли и снова закрыли — нижний держит замок, пока не закроют его', async () => {
		const lower = await layer()
		const upper = await layer()

		lower.owner.open = true
		upper.owner.open = true

		upper.owner.open = false
		upper.owner.open = true
		upper.owner.open = false
		await nextFrame()

		expect(overflows()).toEqual(LOCKED)

		lower.owner.open = false
		await nextFrame()

		expect(overflows()).toEqual(FREE)
	})

	/** Корня больше нет — ждать перехода не у кого, и замок отпускается сразу. */
	describe.each<[string, (bundle: TPluginBundle) => void]>([
		['destroy', (bundle) => bundle.destroy()],
		[
			'снятый корень',
			(bundle) => {
				pluginOf(bundle, TElementPlugin).element = null
			},
		],
	])('%s во время ожидания', (_, release) => {
		it('отпускает замок сразу', async () => {
			const { owner, bundle } = await layer()

			owner.open = true
			owner.open = false
			release(bundle)

			expect(overflows()).toEqual(FREE)
		})

		it('через кадр нижний слой замок всё ещё держит', async () => {
			const lower = await layer()
			const upper = await layer()

			lower.owner.open = true
			upper.owner.open = true
			upper.owner.open = false
			release(upper.bundle)
			await nextFrame()

			expect(overflows()).toEqual(LOCKED)

			lower.owner.open = false
			await nextFrame()

			expect(overflows()).toEqual(FREE)
		})
	})
})

describe('стиль документа', () => {
	it('возвращаются прежние инлайновые значения, а не пустые', async () => {
		document.documentElement.style.overflow = 'auto'
		document.body.style.overflow = 'scroll'

		const { owner } = await layer()

		owner.open = true

		expect(overflows()).toEqual(LOCKED)

		owner.open = false
		await nextFrame()

		expect(overflows()).toEqual({ root: 'auto', body: 'scroll' })
	})

	it('ширина полосы прокрутки компенсируется отступом со стороны конца строки', async () => {
		stubViewport(1000, 1015)

		const { owner } = await layer()

		owner.open = true

		expect(document.body.style.paddingInlineEnd).toBe('15px')

		owner.open = false
		await nextFrame()

		expect(document.body.style.paddingInlineEnd).toBe('')
	})

	it('компенсация прибавляется к отступу, который у страницы уже был', async () => {
		stubViewport(1000, 1015)
		document.body.style.paddingInlineEnd = '10px'

		const { owner } = await layer()

		owner.open = true

		expect(document.body.style.paddingInlineEnd).toBe('25px')

		owner.open = false
		await nextFrame()

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

		expect(overflows()).toEqual(FREE)

		pluginOf(bundle, TScrollLockPlugin).enabled = true

		expect(overflows()).toEqual(LOCKED)

		bundle.destroy()

		expect(overflows()).toEqual(FREE)
	})

	it('выключенный вручную замок отпускается тоже после перехода', async () => {
		const owner = new TPopover()
		const root = document.createElement('div')

		document.body.appendChild(root)

		const bundle = track(
			new TPluginBundle(owner).use(TElementPlugin).use(TScrollLockPlugin, { property: null }),
		)
		const plugin = pluginOf(bundle, TScrollLockPlugin)
		const transition = new TProbeTransition()

		pluginOf(bundle, TElementPlugin).element = root
		await nextFrame()

		plugin.enabled = true
		stubTransitions(root, () => [transition])
		plugin.enabled = false
		await nextFrame()

		expect(overflows()).toEqual(LOCKED)

		transition.finish()
		await flush()

		expect(overflows()).toEqual(FREE)
	})

	/**
	 * `enabled` — нужное состояние, а не факт отпирания: о выключении плагин
	 * сообщает сразу, хотя замок ещё лежит.
	 */
	it('смена `enabled` сообщается событием сразу, не дожидаясь отпирания', async () => {
		const { owner, plugin } = await layer()
		const seen: boolean[] = []

		plugin.events.on('change:enabled', (value) => seen.push(value))

		owner.open = true
		owner.open = false

		expect(seen).toEqual([true, false])
		expect(overflows()).toEqual(LOCKED)
	})
})

/**
 * Свой `ctrl` приложения переживает перемонтирование: набор уничтожен, а
 * владелец живёт дальше и открывается снова. Уничтоженный плагин подписку на
 * его открытость снимает — иначе на владельце копились бы обработчики мёртвых
 * плагинов.
 */
describe('уничтожение', () => {
	it('владелец, переживший набор, уничтоженный плагин не будит', async () => {
		const { owner, bundle, plugin } = await layer()
		const seen: boolean[] = []

		plugin.events.on('change:enabled', (value) => seen.push(value))

		owner.open = true
		bundle.destroy()
		owner.open = false
		owner.open = true

		expect(seen).toEqual([true])
	})
})
