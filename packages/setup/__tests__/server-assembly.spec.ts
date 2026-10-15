/**
 * Сторож: сборка списка идёт и на сервере, где нет ни узла, ни
 * `requestAnimationFrame`.
 *
 * Адаптер собирает компонент и на сервере (Vue — `setup()`, React — рендер,
 * Svelte — инициализация): плагины подписываются, движок привязывается,
 * элементы разметки у Vue и Svelte входят в коллекцию, — и события состава,
 * выбора и подсветки приходят плагинам уже тогда. Узел корень получает только
 * в браузере. Работе на кадр он нужен — высоте, чтобы мерить, прокрутке, чтобы
 * крутить, — поэтому плагин планирует кадр, только пока узел у него есть
 * (`ready` … `removed` своего `TElementPlugin`). Что сменилось до узла,
 * применяет `ready`.
 *
 * Окружение — `node`, как у сервера: `requestAnimationFrame` в нём нет, и
 * сторож его не подкладывает. Кадр, запланированный без узла, роняет сборку
 * `ReferenceError`. Серверные тесты Vue и React идут в jsdom, где кадр есть, и
 * этого не видят.
 *
 * Сборка — как у адаптеров: свой контекст и контекст фасада на общем наборе,
 * обмен подписан на состояние, приём (`attach`) — по порядку сборки. Узла нет:
 * `bindElement` не зовётся.
 */

import { describe, it, expect } from 'vitest'
import { TListHeightPlugin, TListScrollPlugin } from '@soldy-ui/plugins'
import {
	ListBoxCollectionDescriptor,
	ListBoxCollectionItemDescriptor,
	ListBoxDescriptor,
	ListBoxItemDescriptor,
	SelectCollectionDescriptor,
	SelectDescriptor,
} from '../content/descriptors'
import {
	TCollectionExtension,
	TCollectionItemExtension,
	TDragAndDropCollectionExtension,
	TVirtualCollectionExtension,
} from '../content/extensions'
import { createAdapterContext } from '../protected/adapter'
import type { IAdapterContext, TExchange } from '../protected/adapter'
import { CallbackProfile, createElevatorFactory } from './helpers'

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
