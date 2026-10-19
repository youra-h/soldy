/**
 * Сторож: сборка компонента идёт и на сервере, где нет ни узла, ни
 * `requestAnimationFrame`.
 *
 * Адаптер собирает компонент и на сервере (Vue — `setup()`, React — рендер,
 * Svelte — инициализация): плагины подписываются, движок привязывается,
 * элементы разметки у Vue и Svelte входят в коллекцию, — и события состава,
 * выбора и подсветки приходят плагинам уже тогда. Снятие там тоже бывает:
 * Solid снимает собранный корень следующей задачей после `renderToString`, и
 * элементы разметки уходят из коллекции. Узел корень получает только в
 * браузере. Работе на кадр он нужен — высоте, чтобы мерить, прокрутке, чтобы
 * крутить, подчёркиванию таба, чтобы найти таб, — поэтому плагин планирует
 * кадр, только пока узел у него есть (`ready` … `removed` своего
 * `TElementPlugin`). Что сменилось до узла, применяет `ready`.
 *
 * Окружение — `node`, как у сервера: `requestAnimationFrame` в нём нет, и
 * сторож его не подкладывает. Кадр, запланированный без узла, бросает
 * `ReferenceError`. Подписчик прямо на эмиттере роняет им сборку, а подписчика
 * проброса (`relayAll` — так `plain` отдаёт события драйвера) шина не роняет:
 * ошибку она печатает в `console.error`. Поэтому `console.error` под шпионом
 * на каждом тесте файла. Серверные тесты Vue и React идут в jsdom, где кадр
 * есть, и этого не видят.
 *
 * Сборка — как у адаптеров: свой контекст и контекст фасада на общем наборе,
 * обмен подписан на состояние, приём (`attach`) — по порядку сборки. Узла нет:
 * `bindElement` не зовётся.
 */

import { afterEach, beforeEach, describe, it, expect, vi } from 'vitest'
import type { MockInstance } from 'vitest'
import {
	TListHeightPlugin,
	TListScrollPlugin,
	TTabsActiveTabPlugin,
	TTextareaAutoresizePlugin,
} from '@soldy-ui/plugins'
import {
	ListBoxCollectionDescriptor,
	ListBoxCollectionItemDescriptor,
	ListBoxDescriptor,
	ListBoxItemDescriptor,
	SelectCollectionDescriptor,
	SelectDescriptor,
	TabsCollectionDescriptor,
	TabsCollectionItemDescriptor,
	TabsDescriptor,
	TabsItemDescriptor,
	TextareaDescriptor,
} from '../content/descriptors'
import {
	TCollectionExtension,
	TCollectionItemExtension,
	TDragAndDropCollectionExtension,
	TVirtualCollectionExtension,
} from '../content/extensions'
import { createAdapterContext } from '../protected/adapter'
import type { IAdapterContext, TExchange } from '../protected/adapter'
import { CallbackProfile, createElevatorFactory, required } from './helpers'

/** Шпион `console.error` текущего теста: вывод не глушится, а считается. */
let consoleError: MockInstance<typeof console.error>

beforeEach(() => {
	consoleError = vi.spyOn(console, 'error')
})

afterEach(() => {
	const calls = [...consoleError.mock.calls]

	// Консоль возвращается до проверки: после упавшего `expect` хук дальше не идёт
	consoleError.mockRestore()

	expect(calls, 'в консоль ушли ошибки').toEqual([])
})

/** Принятый контекст: его обмен и снятие. */
type TAccepted = { readonly exchange: TExchange; readonly unmount: () => void }

/**
 * Принять контекст, как рантайм адаптера: обмен подписан на состояние, затем
 * `attach`. Снятие — отписка и `destroy`.
 */
function accept(context: IAdapterContext): TAccepted {
	const exchange = context.connect(CallbackProfile)
	const off = exchange.state.subscribe(() => {})

	context.attach()

	return {
		exchange,
		unmount: () => {
			off()
			context.destroy()
		},
	}
}

/** Снять принятые контексты в обратном порядке: элементы и фасад раньше владельца. */
function unmountAll(accepted: readonly TAccepted[]): void {
	for (const { unmount } of [...accepted].reverse()) unmount()
}

/**
 * ListBox, собранный как в адаптере Svelte, — и элементы разметки под ним:
 * свой контекст элемента и контекст его фасада, лифт — общий со списком.
 */
function assembleListBox(props: object, markup: readonly object[] = []) {
	const { factory: elevator } = createElevatorFactory()
	const list = createAdapterContext(ListBoxDescriptor(), { props })
	const ownAccepted = accept(list)
	const facade = createAdapterContext(
		ListBoxCollectionDescriptor(),
		{ props, options: { owner: list.instance } },
		{ bundle: list.bundle },
	)
		.use(TCollectionExtension, { elevator })
		.use(TDragAndDropCollectionExtension, { elevator })
		.use(TVirtualCollectionExtension, { elevator })
	const accepted = [ownAccepted, accept(facade)]

	for (const itemProps of markup) {
		const item = createAdapterContext(ListBoxItemDescriptor(), { props: itemProps })

		accepted.push(accept(item))
		accepted.push(
			accept(
				createAdapterContext(
					ListBoxCollectionItemDescriptor(),
					{ props: itemProps },
					{ bundle: item.bundle },
				).use(TCollectionItemExtension, { item: item.instance, elevator }),
			),
		)
	}

	return {
		list,
		facade,
		inputs: ownAccepted.exchange.inputs,
		unmount: () => unmountAll(accepted),
	}
}

/** Select из данных, собранный как в адаптере Vue: свой контекст и контекст фасада. */
function assembleSelect(props: object) {
	const { factory: elevator } = createElevatorFactory()
	const select = createAdapterContext(SelectDescriptor(), { props })
	const ownAccepted = accept(select)
	const facade = createAdapterContext(
		SelectCollectionDescriptor(),
		{ props, options: { owner: select.instance } },
		{ bundle: select.bundle },
	)
		.use(TCollectionExtension, { elevator })
		.use(TVirtualCollectionExtension, { elevator })
	const facadeAccepted = accept(facade)

	return {
		select,
		facade,
		inputs: ownAccepted.exchange.inputs,
		facadeInputs: facadeAccepted.exchange.inputs,
		unmount: () => unmountAll([ownAccepted, facadeAccepted]),
	}
}

/**
 * Tabs, собранный как в адаптере Svelte, — и табы разметки под ним: свой
 * контекст таба и контекст его фасада, лифт — общий с Tabs.
 */
function assembleTabs(props: object, markup: readonly object[] = []) {
	const { factory: elevator } = createElevatorFactory()
	const tabs = createAdapterContext(TabsDescriptor(), { props })
	const ownAccepted = accept(tabs)
	const facade = createAdapterContext(
		TabsCollectionDescriptor(),
		{ props, options: { owner: tabs.instance } },
		{ bundle: tabs.bundle },
	)
		.use(TCollectionExtension, { elevator })
		.use(TDragAndDropCollectionExtension, { elevator })
	const accepted = [ownAccepted, accept(facade)]

	for (const itemProps of markup) {
		const item = createAdapterContext(TabsItemDescriptor(), { props: itemProps })

		accepted.push(accept(item))
		accepted.push(
			accept(
				createAdapterContext(
					TabsCollectionItemDescriptor(),
					{ props: itemProps },
					{ bundle: item.bundle },
				).use(TCollectionItemExtension, { item: item.instance, elevator }),
			),
		)
	}

	return { facade, unmount: () => unmountAll(accepted) }
}

/** Значения элементов по порядку. */
const valuesOf = (items: ReadonlyArray<{ readonly value?: unknown }>) =>
	items.map((item) => item.value)

describe('сторож: сборка списка без узла и без requestAnimationFrame', () => {
	/** Иначе сторож молча перестанет ловить кадр, запланированный сборкой. */
	it('в окружении нет requestAnimationFrame — как на сервере', () => {
		expect('requestAnimationFrame' in globalThis).toBe(false)
	})

	/** Иначе сценарии ниже проходили бы без тех, кто работает на кадр. */
	it('плагины, которые работают на кадр, стоят в наборе ListBox и Select', () => {
		const list = createAdapterContext(ListBoxDescriptor(), { props: {} })
		const select = createAdapterContext(SelectDescriptor(), { props: {} })

		expect(list.bundle?.get(TListHeightPlugin)).toBeDefined()
		expect(list.bundle?.get(TListScrollPlugin)).toBeDefined()
		expect(select.bundle?.get(TListHeightPlugin)).toBeDefined()

		list.destroy()
		select.destroy()
	})

	it('ListBox из items: сборка, приём, смена value и maxRows, уничтожение', () => {
		const props = {
			items: [
				{ value: 'a', text: 'A' },
				{ value: 'b', text: 'B' },
				{ value: 'c', text: 'C' },
			],
			value: 'b',
			maxRows: 2,
		}
		const { list, facade, inputs, unmount } = assembleListBox(props)
		const { selection } = facade.instance.engine.extensions

		expect(valuesOf(selection.selected)).toEqual(['b'])

		inputs.full({ ...props, value: 'c', maxRows: 3 })

		expect(valuesOf(selection.selected)).toEqual(['c'])
		expect(list.instance.maxRows).toBe(3)

		unmount()
	})

	it('ListBox с элементами разметки: входят в коллекцию на attach, выбранный — выбран', () => {
		const { facade, unmount } = assembleListBox({}, [
			{ value: 'a', text: 'A' },
			{ value: 'b', text: 'B', selected: true },
		])
		const { batch, selection } = facade.instance.engine.extensions

		expect(valuesOf(batch.items)).toEqual(['a', 'b'])
		expect(valuesOf(selection.selected)).toEqual(['b'])

		unmount()
	})

	it('Select из items: сборка, приём, смена maxRows и состава, уничтожение', () => {
		const props = {
			items: [
				{ value: 'a', text: 'A' },
				{ value: 'b', text: 'B' },
			],
			value: 'a',
			maxRows: 1,
		}
		const { select, facade, inputs, facadeInputs, unmount } = assembleSelect(props)
		const { batch } = facade.instance.engine.extensions

		expect(valuesOf(batch.items)).toEqual(['a', 'b'])

		inputs.full({ ...props, maxRows: 2 })
		facadeInputs.full({ ...props, items: [...props.items, { value: 'c', text: 'C' }] })

		expect(select.instance.maxRows).toBe(2)
		expect(valuesOf(batch.items)).toEqual(['a', 'b', 'c'])

		unmount()
	})
})

/**
 * Авторост Textarea работает на кадр: мерит текст поля и пишет его высоту.
 * Сборка поля идёт и на сервере, и значение, строки, потолок и размер там
 * меняются, а узла нет — кадр плагин не планирует, высоту поставит `ready`.
 */
describe('сторож: сборка Textarea без узла и без requestAnimationFrame', () => {
	/** Иначе сценарий ниже прошёл бы без того, кто работает на кадр. */
	it('плагин автороста стоит в наборе Textarea', () => {
		const textarea = createAdapterContext(TextareaDescriptor(), { props: {} })

		expect(textarea.bundle?.get(TTextareaAutoresizePlugin)).toBeDefined()

		textarea.destroy()
	})

	it('сборка с авторостом, приём, смена value, rows, maxRows, size и autoresize, уничтожение', () => {
		const props = { autoresize: true, rows: 2, maxRows: 4, value: 'a', counter: true }
		const textarea = createAdapterContext(TextareaDescriptor(), { props })
		const { exchange, unmount } = accept(textarea)

		exchange.inputs.full({ ...props, value: 'a\nb\nc', rows: 3, maxRows: 6, size: 'lg' })
		exchange.inputs.full({ ...props, autoresize: false })

		expect(textarea.instance.value).toBe('a')
		expect(textarea.instance.rows).toBe(2)
		expect(textarea.instance.autoresize).toBe(false)

		unmount()
	})
})

/**
 * Подчёркивание активного таба работает на кадр: таб сняли или переставили —
 * место активного оно мерит кадром позже, когда разметка перерисована. Табы
 * разметки входят в коллекцию и на сервере, а снимает их там Solid вместе с
 * корнем после `renderToString`. Узла нет — кадр плагин не планирует, место
 * померит `ready`.
 */
describe('сторож: сборка Tabs без узла и без requestAnimationFrame', () => {
	/** Иначе сценарий ниже прошёл бы без того, кто работает на кадр. */
	it('плагин подчёркивания стоит в наборе Tabs', () => {
		const tabs = createAdapterContext(TabsDescriptor(), { props: {} })

		expect(tabs.bundle?.get(TTabsActiveTabPlugin)).toBeDefined()

		tabs.destroy()
	})

	it('табы разметки: вход на attach, перестановка, снятие со всеми табами', () => {
		const { facade, unmount } = assembleTabs({}, [
			{ value: 'a', text: 'A' },
			{ value: 'b', text: 'B', active: true },
			{ value: 'c', text: 'C' },
		])
		const { activation, batch, plain } = facade.instance.engine.extensions
		const moved: unknown[] = []
		const removed: unknown[] = []

		plain.events.on('item:moved', (e) => moved.push(e.item.value))
		plain.events.on('item:removed', (e) => removed.push(e.item.value))

		expect(valuesOf(batch.items)).toEqual(['a', 'b', 'c'])
		expect(activation.activeItem?.value).toBe('b')

		plain.move(required(batch.items[2], 'таб c'), 0)

		expect(valuesOf(batch.items)).toEqual(['c', 'a', 'b'])

		// Табы разметки уходят из коллекции раньше Tabs — как при снятии корня
		unmount()

		expect(moved).toEqual(['c'])
		expect(removed).toEqual(['c', 'b', 'a'])
	})
})
