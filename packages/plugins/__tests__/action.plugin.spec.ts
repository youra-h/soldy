// @vitest-environment jsdom

/**
 * TActionPlugin — куда запись `focused` ставит фокус.
 *
 * У поля, ListBox и Tabs корень — коробка вокруг узла, который держит фокус:
 * `<input>`, узла списка, таб-остановки. Запись `focused = true` ставила
 * фокус корню, а корень его не держит, и `focused` показывал неправду. Узел
 * называет правило дескриптора (`focusTarget`), без правила — корень, как
 * раньше.
 *
 * Плагины собраны настоящими bundle, как в рантайме, но без адаптера:
 * разметку тест строит сам в том виде, в каком её рисует Vue.
 */

import { describe, it, expect, afterEach } from 'vitest'
import { TControl, TTabs, TTabsItem, createEngineTabs } from '@soldy-ui/core'
import type { IControlProps, ITabsItem, ITabsItemProps } from '@soldy-ui/core'
import {
	TActionPlugin,
	TCollectionBundlesPlugin,
	TCollectionElements,
	TElementPlugin,
	TPluginBundle,
	fieldOf,
	listOf,
	tabStopOf,
} from '../src'
import type { IActionPluginOptions, IPlugin, IPluginConstructor } from '../src'

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
 * Корень поля, как у Input: кнопка в слоте `leading` — своя остановка Tab
 * перед полем, — само поле и кнопка у конца. Корень держит остановку Tab
 * сам (`tabindex`), чтобы в jsdom его было видно фокусируемым: без правила
 * фокус встаёт на него.
 */
function fieldRoot() {
	const root = document.createElement('div')
	const leading = document.createElement('button')
	const input = document.createElement('input')
	const trailing = document.createElement('button')

	root.tabIndex = 0
	root.append(leading, input, trailing)

	return { root, leading, input, trailing }
}

/**
 * Контрол с плагином действия на корне в документе. Узел приходит плагину,
 * как от адаптера: в `TElementPlugin`, а `ready` — через кадр.
 */
async function mount(
	root: Element,
	options?: IActionPluginOptions,
	props: Partial<IControlProps> = {},
) {
	const ctrl = new TControl(props)
	const bundle = new TPluginBundle(ctrl).use(TElementPlugin).use(TActionPlugin, options)

	if (!root.isConnected) document.body.appendChild(root)

	pluginOf(bundle, TElementPlugin).element = root
	await nextFrame()

	return { ctrl, action: pluginOf(bundle, TActionPlugin) }
}

afterEach(() => {
	document.body.innerHTML = ''
})

describe('запись focused · узел фокуса', () => {
	it('правило нашло узел — фокус на нём, а не на корне и не на кнопке перед ним', async () => {
		const { root, input } = fieldRoot()
		const { ctrl } = await mount(root, { focusTarget: fieldOf })

		ctrl.focused = true

		expect(document.activeElement).toBe(input)
		expect(ctrl.focused).toBe(true)
	})

	it('правило вернуло null — фокус на корне', async () => {
		const { root } = fieldRoot()
		const { ctrl } = await mount(root, { focusTarget: () => null })

		ctrl.focused = true

		expect(document.activeElement).toBe(root)
		expect(ctrl.focused).toBe(true)
	})

	it('без правила — корень, как раньше', async () => {
		const { root } = fieldRoot()
		const { ctrl } = await mount(root)

		ctrl.focused = true

		expect(document.activeElement).toBe(root)
	})

	it('правило получает корень и контекст набора', async () => {
		const { root, input } = fieldRoot()
		const seen: unknown[][] = []
		const { ctrl } = await mount(root, {
			focusTarget: (node, ctx) => {
				seen.push([node, ctx.getInstance()])

				return input
			},
		})

		ctrl.focused = true

		expect(seen).toEqual([[root, ctrl]])
	})

	/**
	 * Фокус встал внутрь корня раньше, чем плагин получил узел: `focused` ещё
	 * `false`. Запись `true` его не двигает — компонент и так в фокусе, —
	 * как не двигает обратная сторона: `focusin` корня от любого узла внутри.
	 */
	it('фокус уже внутри корня запись не двигает', async () => {
		const { root, leading } = fieldRoot()

		document.body.appendChild(root)
		leading.focus()

		const { ctrl } = await mount(root, { focusTarget: fieldOf })

		ctrl.focused = true

		expect(document.activeElement).toBe(leading)
	})

	it('focused = false снимает фокус с узла внутри корня', async () => {
		const { root } = fieldRoot()
		const { ctrl } = await mount(root, { focusTarget: fieldOf })

		ctrl.focused = true
		ctrl.focused = false

		expect(document.activeElement).toBe(document.body)
		expect(ctrl.focused).toBe(false)
	})

	it('focused = false снимает фокус и с узла мимо правила — с кнопки у конца', async () => {
		const { root, trailing } = fieldRoot()
		const { ctrl } = await mount(root, { focusTarget: fieldOf })

		trailing.focus()

		expect(ctrl.focused).toBe(true)

		ctrl.focused = false

		expect(document.activeElement).toBe(document.body)
	})

	it('focused: true до узла — на ready фокус встаёт на узел правила', async () => {
		const { root, input } = fieldRoot()

		await mount(root, { focusTarget: fieldOf }, { focused: true })

		expect(document.activeElement).toBe(input)
	})

	it('цикла focusin → focused → focus() нет', async () => {
		const { root, input } = fieldRoot()
		const { ctrl } = await mount(root, { focusTarget: fieldOf })
		const changes: boolean[] = []

		ctrl.events.on('change:focused', (value: boolean) => changes.push(value))

		ctrl.focused = true
		input.blur()
		input.focus()

		expect(changes).toEqual([true, false, true])
		expect(document.activeElement).toBe(input)
	})
})

describe('focus() и blur() плагина', () => {
	it('focus() ставит фокус на узел правила', async () => {
		const { root, input } = fieldRoot()
		const { ctrl, action } = await mount(root, { focusTarget: fieldOf })

		action.focus()

		expect(document.activeElement).toBe(input)
		expect(ctrl.focused).toBe(true)
	})

	it('focus() без правила — на корень', async () => {
		const { root } = fieldRoot()
		const { action } = await mount(root)

		action.focus()

		expect(document.activeElement).toBe(root)
	})

	it('blur() снимает фокус с узла внутри корня', async () => {
		const { root, input } = fieldRoot()
		const { ctrl, action } = await mount(root, { focusTarget: fieldOf })

		input.focus()
		action.blur()

		expect(document.activeElement).toBe(document.body)
		expect(ctrl.focused).toBe(false)
	})

	it('blur() не трогает фокус вне корня', async () => {
		const { root } = fieldRoot()
		const outside = document.createElement('button')

		document.body.appendChild(outside)

		const { action } = await mount(root, { focusTarget: fieldOf })

		outside.focus()
		action.blur()

		expect(document.activeElement).toBe(outside)
	})
})

describe('правила узла фокуса', () => {
	describe('fieldOf', () => {
		it('первое поле формы в корне, а не кнопка перед ним', () => {
			const { root, input } = fieldRoot()

			expect(fieldOf(root)).toBe(input)
		})

		it('скрытое поле — значение для формы, не поле фокуса', () => {
			const root = document.createElement('div')
			const hidden = document.createElement('input')
			const input = document.createElement('input')

			hidden.type = 'hidden'
			root.append(hidden, input)

			expect(fieldOf(root)).toBe(input)
		})

		it('textarea — тоже поле', () => {
			const root = document.createElement('div')
			const textarea = document.createElement('textarea')

			root.append(document.createElement('button'), textarea)

			expect(fieldOf(root)).toBe(textarea)
		})

		it('поля нет — null', () => {
			const root = document.createElement('div')

			root.append(document.createElement('button'))

			expect(fieldOf(root)).toBeNull()
		})
	})

	describe('listOf', () => {
		it('узел списка с ролью listbox, а не поле шапки рядом с ним', () => {
			const root = document.createElement('div')
			const header = document.createElement('input')
			const list = document.createElement('div')

			list.setAttribute('role', 'listbox')
			root.append(header, list)

			expect(listOf(root)).toBe(list)
		})
	})

	describe('tabStopOf', () => {
		/**
		 * Набор табов, как его рисует Vue: корень, в нём кнопка в слоте
		 * `leading`, у каждого таба обёртка (узел элемента) и строка с
		 * `role="tab"`, — и плагин действия с правилом таб-остановки. Движок —
		 * `createEngineTabs`, как у компонента: остановку считает
		 * `TTabsExtension`.
		 */
		async function tabs(props: Partial<ITabsItemProps>[]) {
			const owner = new TTabs()
			const engine = createEngineTabs({ owner })
			const items = props.map((item) => engine.extensions.plain.push(new TTabsItem(item)))
			const root = document.createElement('div')
			const leading = document.createElement('button')

			root.appendChild(leading)
			document.body.appendChild(root)

			const bundle = new TPluginBundle(owner)
				.use(TElementPlugin)
				.use(TActionPlugin, { focusTarget: tabStopOf })
				.use(TCollectionBundlesPlugin)
				.use(TCollectionElements)

			const bundles = pluginOf(bundle, TCollectionBundlesPlugin)

			for (const item of items) {
				const node = document.createElement('div')
				const tab = document.createElement('button')

				tab.setAttribute('role', 'tab')
				tab.dataset.value = String(item.value)
				node.appendChild(tab)
				root.appendChild(node)

				const itemBundle = new TPluginBundle(item).use(TElementPlugin)

				pluginOf(itemBundle, TElementPlugin).element = node
				bundles.register(itemBundle, item)
			}

			bundles.bindEngine(engine)
			pluginOf(bundle, TElementPlugin).element = root
			await nextFrame()

			const find = (value: string): ITabsItem => {
				const item = items.find((candidate) => candidate.value === value)

				if (!item) throw new Error(`таба ${value} нет`)

				return item
			}

			/** Строка таба с ролью. */
			const tabNode = (value: string) => root.querySelector(`[data-value="${value}"]`)

			const activation = engine.extensions.activation

			// Активный — средний: остановка не совпадает с первым табом
			activation.activate(find('b'))

			return {
				owner,
				root,
				find,
				tabNode,
				activation,
				/** Таб, на котором фокус. */
				focused: () => document.activeElement?.getAttribute('data-value'),
			}
		}

		const ABC: Partial<ITabsItemProps>[] = [
			{ value: 'a', text: 'A' },
			{ value: 'b', text: 'B' },
			{ value: 'c', text: 'C' },
		]

		it('остановка — активный таб: запись focused ставит фокус на него, мимо leading', async () => {
			const { owner, focused } = await tabs(ABC)

			owner.focused = true

			expect(focused()).toBe('b')
			expect(owner.focused).toBe(true)
		})

		it('активный выключен — первый таб, на который можно перейти', async () => {
			const { owner, find, focused } = await tabs(ABC)

			find('b').disabled = true
			owner.focused = true

			expect(focused()).toBe('a')
		})

		/**
		 * Остановка — по модели, а не по `[tabindex="0"]`: в такте смены
		 * активного разметка ещё старая — адаптер перерисует `tabindex` позже,
		 * — и фокус ушёл бы на прежний таб.
		 */
		it('смена активного и focused = true в одном такте — фокус на новом табе', async () => {
			const { owner, find, tabNode, activation, focused } = await tabs(ABC)

			// Разметка такта до смены: остановка у прежнего активного
			tabNode('b')?.setAttribute('tabindex', '0')
			tabNode('c')?.setAttribute('tabindex', '-1')

			activation.activate(find('c'))
			owner.focused = true

			expect(focused()).toBe('c')
		})

		it('табов, на которые можно перейти, нет — фокус на корне', async () => {
			const { owner, root, find } = await tabs(ABC)

			root.tabIndex = 0

			for (const value of ['a', 'b', 'c']) find(value).disabled = true

			owner.focused = true

			expect(document.activeElement).toBe(root)
		})
	})
})
