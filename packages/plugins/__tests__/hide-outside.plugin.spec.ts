// @vitest-environment jsdom

/**
 * THideOutsidePlugin — пока владелец открыт, фон под ним спрятан от
 * скринридера (`aria-hidden`).
 *
 * Класса ядра у модального окна ещё нет, и плагину он не нужен: открытость он
 * читает рефлексией по имени свойства. Владельцем в тесте служит `TPopover` —
 * у него есть `open` и шина событий, как в `scroll-lock.plugin.spec.ts`.
 *
 * Разметку тест строит сам, а номер слоя (`data-layer`) ставит руками — так
 * его ставит показанный `TFrame`. Проверяется то, ради чего пометки
 * пересчитываются, а не снимаются при открытии: слой выше окна остаётся
 * доступным, даже если получил номер уже при открытом окне. И то, ради чего
 * у пометки счётчик: два окна не снимают пометок друг друга.
 */

import { describe, it, expect, afterEach } from 'vitest'
import { FRAME_LAYER_ATTRIBUTE, TPopover } from '@soldy-ui/core'
import { TDismissPlugin, TElementPlugin, THideOutsidePlugin, TPluginBundle } from '../src'
import type { IHideOutsidePluginOptions, IPlugin, IPluginConstructor } from '../src'

const nextFrame = () => new Promise((resolve) => requestAnimationFrame(resolve))

/** Наблюдатель пересчитывает на микрозадаче — ждём, пока он отработает. */
const mutations = () => new Promise((resolve) => setTimeout(resolve))

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
 * Наборы, созданные тестом. Пометки переживают тест — счётчик у узла общий,
 * — поэтому набор, оставшийся открытым, обязан быть уничтожен.
 */
const bundles: TPluginBundle[] = []

function track(bundle: TPluginBundle): TPluginBundle {
	bundles.push(bundle)

	return bundle
}

/** Узел страницы — ребёнок `body` или заданного контейнера. */
function pageNode(parent: Element = document.body): HTMLElement {
	const node = document.createElement('div')

	parent.appendChild(node)

	return node
}

/** Узел страницы со своим слоем — панель `TFrame`. */
function layerNode(layer: number): HTMLElement {
	const node = pageNode()

	node.setAttribute(FRAME_LAYER_ATTRIBUTE, String(layer))

	return node
}

/**
 * Модальное окно: владелец, его корень и набор с пометкой фона. Корень и есть
 * панель — окно телепортировано целиком; `layer` — номер его слоя.
 */
async function modal(
	layer: number | null,
	options?: IHideOutsidePluginOptions,
	parent: Element = document.body,
) {
	const owner = new TPopover()
	const root = pageNode(parent)

	if (layer !== null) root.setAttribute(FRAME_LAYER_ATTRIBUTE, String(layer))

	const bundle = track(
		new TPluginBundle(owner).use(TElementPlugin).use(THideOutsidePlugin, options),
	)

	pluginOf(bundle, TElementPlugin).element = root
	await nextFrame()

	return { owner, root, bundle, plugin: pluginOf(bundle, THideOutsidePlugin) }
}

const ariaHidden = (node: Element) => node.getAttribute('aria-hidden')

afterEach(() => {
	for (const bundle of bundles.reverse()) bundle.destroy()

	bundles.length = 0

	document.body.innerHTML = ''
})

describe('фон и открытость владельца', () => {
	it('открытие прячет соседей окна, само окно и его содержимое — нет', async () => {
		const page = pageNode()
		const aside = pageNode()
		const { owner, root } = await modal(1001)
		const inside = pageNode(root)

		owner.open = true

		expect(ariaHidden(page)).toBe('true')
		expect(ariaHidden(aside)).toBe('true')
		expect(ariaHidden(root)).toBeNull()
		expect(inside.closest('[aria-hidden="true"]')).toBeNull()
	})

	it('закрытие возвращает всё как было', async () => {
		const page = pageNode()
		const { owner } = await modal(1001)

		owner.open = true
		owner.open = false

		expect(ariaHidden(page)).toBeNull()
	})

	it('aria-hidden, который страница поставила сама, возвращается прежним', async () => {
		const shown = pageNode()
		const decor = pageNode()

		shown.setAttribute('aria-hidden', 'false')
		decor.setAttribute('aria-hidden', 'true')

		const { owner } = await modal(1001)

		owner.open = true

		expect(ariaHidden(shown)).toBe('true')
		expect(ariaHidden(decor)).toBe('true')

		owner.open = false

		expect(ariaHidden(shown)).toBe('false')
		expect(ariaHidden(decor)).toBe('true')
	})

	it('размонтирование корня снимает пометки', async () => {
		const page = pageNode()
		const { owner, bundle } = await modal(1001)

		owner.open = true
		pluginOf(bundle, TElementPlugin).element = null

		expect(ariaHidden(page)).toBeNull()
	})

	it('destroy снимает пометки', async () => {
		const page = pageNode()
		const { owner, bundle } = await modal(1001)

		owner.open = true
		bundle.destroy()

		expect(ariaHidden(page)).toBeNull()
	})

	it('без корня прятать не от чего: фон прячется, как только корень объявлен', async () => {
		const page = pageNode()
		const owner = new TPopover()
		const root = pageNode()
		const bundle = track(new TPluginBundle(owner).use(TElementPlugin).use(THideOutsidePlugin))

		owner.open = true

		expect(ariaHidden(page)).toBeNull()

		pluginOf(bundle, TElementPlugin).element = root
		await nextFrame()

		expect(ariaHidden(page)).toBe('true')
		expect(ariaHidden(root)).toBeNull()
	})

	it('открытый со старта владелец прячет фон', async () => {
		const page = pageNode()
		const owner = new TPopover({ open: true })
		const root = pageNode()
		const bundle = track(new TPluginBundle(owner).use(TElementPlugin).use(THideOutsidePlugin))

		pluginOf(bundle, TElementPlugin).element = root
		await nextFrame()

		expect(ariaHidden(page)).toBe('true')
	})
})

describe('панель', () => {
	it('телепортирована глубже body: прячутся соседи и её, и её предков', async () => {
		const page = pageNode()
		const portal = pageNode()
		const neighbour = pageNode(portal)
		const { owner, root } = await modal(1001, {}, portal)

		owner.open = true

		expect(ariaHidden(page)).toBe('true')
		expect(ariaHidden(neighbour)).toBe('true')
		expect(ariaHidden(portal)).toBeNull()
		expect(ariaHidden(root)).toBeNull()
	})

	it('с TDismissPlugin панель — узел с пометкой владельцем, корень в странице — фон', async () => {
		const owner = new TPopover()
		const root = pageNode()
		const panel = pageNode()
		const bundle = track(
			new TPluginBundle(owner)
				.use(TElementPlugin)
				.use(TDismissPlugin)
				.use(THideOutsidePlugin),
		)

		for (const [name, value] of Object.entries(
			pluginOf(bundle, TDismissPlugin).ownerAttribute,
		)) {
			panel.setAttribute(name, value)
		}

		pluginOf(bundle, TElementPlugin).element = root
		await nextFrame()

		owner.open = true

		expect(ariaHidden(panel)).toBeNull()
		expect(ariaHidden(root)).toBe('true')
	})
})

describe('слои', () => {
	it('слой выше окна остаётся доступным, слой ниже и узел без слоя прячутся', async () => {
		const above = layerNode(1002)
		const below = layerNode(1000)
		const plain = pageNode()
		const { owner } = await modal(1001)

		owner.open = true

		expect(ariaHidden(above)).toBeNull()
		expect(ariaHidden(below)).toBe('true')
		expect(ariaHidden(plain)).toBe('true')
	})

	it.each([
		['без номера слоя', null],
		['со старым номером ниже окна', 1000],
	])(
		'скрытая панель %s прячется и открывается, когда её показали выше окна',
		async (_, layer) => {
			// Так лежит в `body` список Select из окна: смонтирован, но скрыт, и
			// номер слоя получит, только когда его откроют
			const list = layer === null ? pageNode() : layerNode(layer)
			const { owner } = await modal(1001)

			owner.open = true

			expect(ariaHidden(list)).toBe('true')

			list.setAttribute(FRAME_LAYER_ATTRIBUTE, '1002')
			await mutations()

			expect(ariaHidden(list)).toBeNull()
		},
	)

	it('номер своего слоя читается на каждом пересчёте', async () => {
		// Окно открыли, а номер слоя ему разметка допишет следующим рендером:
		// до этого старый номер ниже списка, открытого на странице раньше
		const list = layerNode(1002)
		const { owner, root } = await modal(1001)

		owner.open = true

		expect(ariaHidden(list)).toBeNull()

		root.setAttribute(FRAME_LAYER_ATTRIBUTE, '1003')
		await mutations()

		expect(ariaHidden(list)).toBe('true')
	})

	it('слой, телепортированный внутрь окна, соседей по окну не прячет', async () => {
		const { owner, root } = await modal(1001)
		const wrapper = pageNode(root)
		const sibling = pageNode(wrapper)
		const nested = pageNode(wrapper)

		nested.setAttribute(FRAME_LAYER_ATTRIBUTE, '1002')

		owner.open = true

		expect(ariaHidden(wrapper)).toBeNull()
		expect(ariaHidden(sibling)).toBeNull()
		expect(ariaHidden(nested)).toBeNull()
	})

	it('у окна слоя нет — чужой слой не в счёт, прячется всё', async () => {
		const above = layerNode(1002)
		const { owner } = await modal(null)

		owner.open = true

		expect(ariaHidden(above)).toBe('true')
	})
})

describe('состав страницы', () => {
	it('новый ребёнок body при открытом окне прячется', async () => {
		const { owner } = await modal(1001)

		owner.open = true

		const toast = pageNode()

		await mutations()

		expect(ariaHidden(toast)).toBe('true')
	})

	it('узел, перенесённый в окно, пометку отдаёт', async () => {
		const note = pageNode()
		const { owner, root } = await modal(1001)

		owner.open = true

		expect(ariaHidden(note)).toBe('true')

		root.appendChild(note)
		await mutations()

		expect(ariaHidden(note)).toBeNull()
	})

	it('в DOM пишется только разница: новое содержимое окна пометок не трогает', async () => {
		pageNode()

		const { owner, root } = await modal(1001)

		owner.open = true

		const writes: MutationRecord[] = []
		const spy = new MutationObserver((records) => writes.push(...records))

		spy.observe(document.body, {
			subtree: true,
			attributes: true,
			attributeFilter: ['aria-hidden'],
		})

		pageNode(root)
		await mutations()
		spy.disconnect()

		expect(writes).toHaveLength(0)
	})

	it('после закрытия новый узел не прячется: наблюдателя больше нет', async () => {
		const { owner } = await modal(1001)

		owner.open = true
		owner.open = false

		const toast = pageNode()

		await mutations()

		expect(ariaHidden(toast)).toBeNull()
	})
})

describe('два окна', () => {
	it('окно поверх окна прячет и нижнее, закрытие верхнего возвращает его', async () => {
		const page = pageNode()
		const lower = await modal(1001)

		lower.owner.open = true

		const upper = await modal(1002)

		upper.owner.open = true

		expect(ariaHidden(lower.root)).toBe('true')
		expect(ariaHidden(upper.root)).toBeNull()
		expect(ariaHidden(page)).toBe('true')

		upper.owner.open = false

		expect(ariaHidden(lower.root)).toBeNull()
		expect(ariaHidden(page)).toBe('true')

		lower.owner.open = false

		expect(ariaHidden(page)).toBeNull()
	})

	it('закрытие нижнего первым не снимает пометок верхнего и не теряет прежнее значение', async () => {
		const page = pageNode()

		page.setAttribute('aria-hidden', 'false')

		const lower = await modal(1001)

		lower.owner.open = true

		const upper = await modal(1002)

		upper.owner.open = true
		lower.owner.open = false

		expect(ariaHidden(page)).toBe('true')
		expect(ariaHidden(lower.root)).toBe('true')

		upper.owner.open = false

		expect(ariaHidden(page)).toBe('false')
		expect(ariaHidden(lower.root)).toBeNull()
	})
})

describe('ручной путь', () => {
	it('без привязки к владельцу фон прячет `enabled`', async () => {
		const page = pageNode()
		const { owner, bundle, plugin } = await modal(1001, { property: null })

		owner.open = true

		expect(ariaHidden(page)).toBeNull()

		plugin.enabled = true

		expect(ariaHidden(page)).toBe('true')

		bundle.destroy()

		expect(ariaHidden(page)).toBeNull()
	})

	it('смена `enabled` сообщается событием', async () => {
		const { owner, plugin } = await modal(1001)
		const seen: boolean[] = []

		plugin.events.on('change:enabled', (value) => seen.push(value))

		owner.open = true
		owner.open = false

		expect(seen).toEqual([true, false])
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
		const { owner, bundle, plugin } = await modal(1001)
		const seen: boolean[] = []

		plugin.events.on('change:enabled', (value) => seen.push(value))

		owner.open = true
		bundle.destroy()
		owner.open = false
		owner.open = true

		expect(seen).toEqual([true])
	})
})
