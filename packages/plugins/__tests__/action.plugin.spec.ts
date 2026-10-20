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
 * Остановка в модели бывает новее разметки: таб добавили и сделали активным в
 * том же такте, что и запись. Тогда запись ждёт узла — входа таба в коллекцию
 * и `ready` его узла (группа «ожидание узла»).
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
import type { IActionPluginOptions, IPlugin, IPluginConstructor, TFocusTarget } from '../src'

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
		 * `role="tab"`, — и плагин действия с правилом таб-остановки (своё
		 * правило — у теста, который считает его вызовы). Движок —
		 * `createEngineTabs`, как у компонента: остановку считает
		 * `TTabsExtension`.
		 */
		async function tabs(props: Partial<ITabsItemProps>[], rule: TFocusTarget = tabStopOf) {
			const owner = new TTabs()
			const engine = createEngineTabs({ owner })
			const items = props.map((item) => engine.extensions.plain.push(new TTabsItem(item)))
			const root = document.createElement('div')
			const leading = document.createElement('button')

			root.appendChild(leading)
			document.body.appendChild(root)

			const bundle = new TPluginBundle(owner)
				.use(TElementPlugin)
				.use(TActionPlugin, { focusTarget: rule })
				.use(TCollectionBundlesPlugin)
				.use(TCollectionElements)

			const bundles = pluginOf(bundle, TCollectionBundlesPlugin)
			const rootElement = pluginOf(bundle, TElementPlugin)

			/**
			 * Разметка таба: обёртка — узел элемента — и строка с ролью. Вход
			 * таба в коллекцию (`register`) и привязка его узла (`bind`) — два
			 * шага, порознь: их порядок решает адаптер.
			 */
			const draw = (item: ITabsItem) => {
				const node = document.createElement('div')
				const tab = document.createElement('button')
				const itemBundle = new TPluginBundle(item).use(TElementPlugin)

				tab.setAttribute('role', 'tab')
				tab.dataset.value = String(item.value)
				node.appendChild(tab)

				return {
					item,
					register: () => bundles.register(itemBundle, item),
					bind: () => {
						root.appendChild(node)
						pluginOf(itemBundle, TElementPlugin).element = node
					},
				}
			}

			for (const item of items) {
				const drawn = draw(item)

				drawn.bind()
				drawn.register()
			}

			bundles.bindEngine(engine)
			rootElement.element = root
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
				bundle,
				root,
				leading,
				rootElement,
				action: pluginOf(bundle, TActionPlugin),
				find,
				tabNode,
				activation,
				/**
				 * Новый таб: в движке он уже есть, а разметки у него нет — вход
				 * в коллекцию и узел тест делает сам.
				 */
				add: (value: string) =>
					draw(
						engine.extensions.plain.push(
							new TTabsItem({ value, text: value.toUpperCase() }),
						),
					),
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

		/**
		 * Таб добавили и сделали активным в том же такте, что и запись
		 * `focused`: остановка в модели — он, а узла у него ещё нет, и корень
		 * фокус не держит. Запись ждёт узла и ставит фокус, когда таб вошёл в
		 * коллекцию и его узел объявлен.
		 */
		describe('ожидание узла', () => {
			it('новый таб и focused = true в одном такте — фокус встаёт, когда таб нарисован', async () => {
				const { owner, add, activation, focused } = await tabs(ABC)
				const d = add('d')

				activation.activate(d.item)
				owner.focused = true

				// Узла таба нет: фокуса нет нигде, а запись не откатилась
				expect(document.activeElement).toBe(document.body)
				expect(owner.focused).toBe(true)

				d.register()
				d.bind()

				// Узел привязан, но объявят его кадром позже
				expect(document.activeElement).toBe(document.body)

				await nextFrame()

				expect(focused()).toBe('d')
				expect(owner.focused).toBe(true)
			})

			/**
			 * Узел привязан и объявлен раньше, чем таб вошёл в коллекцию: `ready`
			 * прошло до входа, и фокус встаёт на самом входе.
			 */
			it('узел объявлен раньше входа таба в коллекцию — фокус встаёт на входе', async () => {
				const { owner, add, activation, focused } = await tabs(ABC)
				const d = add('d')

				activation.activate(d.item)
				owner.focused = true
				d.bind()
				await nextFrame()

				expect(document.activeElement).toBe(document.body)

				d.register()

				expect(focused()).toBe('d')
			})

			/**
			 * Цель плагин не запоминает: на каждое пробуждение правило ищет
			 * остановку у модели заново, и остановка, сменившаяся за время
			 * ожидания, ждётся уже новая.
			 */
			it('остановка сменилась за время ожидания — фокус на новой, а не на первой', async () => {
				const { owner, add, activation, focused } = await tabs(ABC)
				const d = add('d')
				const e = add('e')

				activation.activate(d.item)
				owner.focused = true
				activation.activate(e.item)

				d.register()
				d.bind()
				await nextFrame()

				expect(document.activeElement).toBe(document.body)

				e.register()
				e.bind()
				await nextFrame()

				expect(focused()).toBe('e')
			})

			it('focus() ждёт узел так же, а фокус, вставший на узел, пишет focused', async () => {
				const { owner, action, add, activation, focused } = await tabs(ABC)
				const d = add('d')

				activation.activate(d.item)
				action.focus()

				expect(document.activeElement).toBe(document.body)
				expect(owner.focused).toBe(false)

				d.register()
				d.bind()
				await nextFrame()

				expect(focused()).toBe('d')
				expect(owner.focused).toBe(true)
			})

			it('ожидание одно: новая попытка заменяет прежнее, и вход таба зовёт правило один раз', async () => {
				let calls = 0
				const counted: TFocusTarget = (root, ctx) => {
					calls++

					return tabStopOf(root, ctx)
				}
				const { owner, action, add, activation } = await tabs(ABC, counted)
				const d = add('d')

				activation.activate(d.item)
				owner.focused = true
				action.focus()
				calls = 0
				d.register()

				expect(calls).toBe(1)
			})

			/**
			 * Что снимает ожидание. Действие отдаёт узел, на котором после него
			 * стоит фокус: таб, нарисованный позже, его не уводит.
			 */
			it.each<[string, (setup: Awaited<ReturnType<typeof tabs>>) => Element]>([
				[
					'focused = false',
					({ owner }) => {
						owner.focused = false

						return document.body
					},
				],
				[
					'blur()',
					({ action }) => {
						action.blur()

						return document.body
					},
				],
				[
					'фокус ушёл мимо корня — в поле, где уже печатают',
					() => {
						const field = document.body.appendChild(document.createElement('input'))

						field.focus()

						return field
					},
				],
				[
					'фокус пришёл в корень — на кнопку в leading',
					({ leading }) => {
						leading.focus()

						return leading
					},
				],
				[
					'снятие корня',
					({ rootElement }) => {
						rootElement.element = null

						return document.body
					},
				],
				[
					'destroy()',
					({ bundle }) => {
						bundle.destroy()

						return document.body
					},
				],
			])('%s — таб нарисован, а фокус не тронут', async (_name, cancel) => {
				const setup = await tabs(ABC)
				const d = setup.add('d')

				setup.activation.activate(d.item)
				setup.owner.focused = true

				const holder = cancel(setup)

				d.register()
				d.bind()
				await nextFrame()

				expect(document.activeElement).toBe(holder)
			})

			/**
			 * Снятое ожидание `focused` не трогает, как и запись, после которой
			 * фокус не встал: назад его плагин не пишет.
			 */
			it('снятое ожидание focused назад не пишет', async () => {
				const { owner, add, activation } = await tabs(ABC)
				const d = add('d')
				const field = document.body.appendChild(document.createElement('input'))

				activation.activate(d.item)
				owner.focused = true
				field.focus()
				d.register()
				d.bind()
				await nextFrame()

				expect(document.activeElement).toBe(field)
				expect(owner.focused).toBe(true)
			})

			/**
			 * `focus()` — просьба, а не состояние: `focused` она не пишет, и новый
			 * `ready` корня её не повторит. Ожидание, снятое вместе с корнем,
			 * таб, нарисованный под новым корнем, не будит.
			 */
			it('снятый корень снимает и ожидание focus(): под новым корнем таб фокус не получает', async () => {
				const { root, rootElement, action, add, activation } = await tabs(ABC)
				const d = add('d')

				activation.activate(d.item)
				action.focus()
				rootElement.element = null
				rootElement.element = root
				await nextFrame()

				d.register()
				d.bind()
				await nextFrame()

				expect(document.activeElement).toBe(document.body)
			})

			it('снятый корень ожидание снимает, а новый ready корня повторяет запись', async () => {
				const { owner, root, rootElement, add, activation, focused } = await tabs(ABC)
				const d = add('d')

				activation.activate(d.item)
				owner.focused = true
				rootElement.element = null
				d.register()
				d.bind()
				await nextFrame()

				expect(document.activeElement).toBe(document.body)

				rootElement.element = root
				await nextFrame()

				expect(focused()).toBe('d')
			})
		})
	})
})
