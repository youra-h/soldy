/**
 * Отменить «стать активным» и «стать выбранным».
 *
 * Перед активацией приходит `item:activate:before`, перед выбором —
 * `item:select:before`, и `preventDefault()` оставляет прежнее состояние, как
 * у `*:before` операций с составом. Снятие активности и выбора хука не имеет.
 *
 * Отмена доходит до всех, кто активирует и выбирает: значение владельца
 * откатывается к тому, что выбрано на самом деле, Tabs при закрытии
 * активного берёт следующего соседа, Select не считает отменённое выбором
 * пользователя.
 */

import { describe, it, expect, vi } from 'vitest'
import {
	TListBox,
	TRadioGroup,
	TRadioGroupCollectionFacade,
	TRadioGroupItem,
	TSelect,
	TSelectCollectionFacade,
	TSelectItem,
	TTabs,
	createEngineActivation,
	createEngineListBox,
	createEngineSelection,
	createEngineTabs,
} from '@soldy-ui/core'
import type { ISelectItem } from '@soldy-ui/core'

const ABC = [{ value: 'a' }, { value: 'b' }, { value: 'c' }]

describe('item:activate:before', () => {
	it('отмена оставляет активным прежний элемент, item:activated не приходит', () => {
		const engine = createEngineActivation({ items: ABC })
		const activation = engine.extensions.activation
		const [a, b] = engine.extensions.batch.items
		const activated = vi.fn()

		expect(activation.activate(a)).toBe(true)

		activation.events.on('item:activate:before', (e) => {
			if (e.item === b) e.preventDefault()
		})
		activation.events.on('item:activated', activated)

		expect(activation.activate(b)).toBe(false)
		expect(activation.activeItem).toBe(a)
		expect(activated).not.toHaveBeenCalled()
	})

	it('уже активный элемент хук не зовёт', () => {
		const engine = createEngineActivation({ items: ABC })
		const activation = engine.extensions.activation
		const [a] = engine.extensions.batch.items
		const before = vi.fn()

		activation.activate(a)
		activation.events.on('item:activate:before', before)

		expect(activation.activate(a)).toBe(true)
		expect(before).not.toHaveBeenCalled()
	})
})

describe('item:select:before', () => {
	it('отмена в single оставляет прежний выбор', () => {
		const engine = createEngineSelection({ items: ABC })
		const selection = engine.extensions.selection
		const [a, b] = engine.extensions.batch.items

		selection.select(a)
		selection.events.on('item:select:before', (e) => {
			if (e.item === b) e.preventDefault()
		})

		expect(selection.select(b)).toBe(false)
		expect(selection.toggle(b)).toBe(false)
		expect(selection.selected).toEqual([a])
	})

	it('снятие выбора хука не имеет', () => {
		const engine = createEngineSelection({ items: ABC })
		const selection = engine.extensions.selection
		const [a] = engine.extensions.batch.items

		selection.select(a)
		selection.events.on('item:select:before', (e) => e.preventDefault())
		selection.deselect(a)

		expect(selection.selected).toEqual([])
	})
})

describe('значение владельца откатывается к выбору', () => {
	it('ListBox single: отменённое значение возвращается к выбранному', () => {
		const owner = new TListBox({ value: 'a' })
		const engine = createEngineListBox({ owner, items: ABC })

		engine.extensions.selection.events.on('item:select:before', (e) => {
			if (e.item.value === 'c') e.preventDefault()
		})

		owner.value = 'c'

		expect(owner.value).toBe('a')
		expect(engine.extensions.selection.selected.map((item) => item.value)).toEqual(['a'])
	})

	it('ListBox multiple: отменённого значения в выборе и в value нет', () => {
		const owner = new TListBox()
		const engine = createEngineListBox({ owner, items: ABC })

		engine.extensions.selection.mode = 'multiple'
		engine.extensions.selection.events.on('item:select:before', (e) => {
			if (e.item.value === 'c') e.preventDefault()
		})

		owner.value = ['a', 'c']

		expect(owner.value).toEqual(['a'])
	})

	it('RadioGroup: отменённое значение возвращается к отмеченному радио', () => {
		const owner = new TRadioGroup({ value: 'a' })
		const collection = new TRadioGroupCollectionFacade({}, { owner })

		ABC.forEach((props) => collection.extensions.plain.push(new TRadioGroupItem(props)))
		collection.extensions.activation.events.on('item:activate:before', (e) => {
			if (e.item.value === 'c') e.preventDefault()
		})

		owner.value = 'c'

		expect(owner.value).toBe('a')
		expect(collection.activeItem?.value).toBe('a')
	})
})

describe('Tabs: закрыли активный таб', () => {
	it('сосед, чью активацию отменили, пропускается к следующему', () => {
		const owner = new TTabs({ closable: true })
		const engine = createEngineTabs({
			owner,
			items: [{ value: 'a' }, { value: 'b' }, { value: 'c' }, { value: 'd' }],
		})
		const [, b] = engine.extensions.batch.items

		engine.extensions.activation.activate(b)
		engine.extensions.activation.events.on('item:activate:before', (e) => {
			if (e.item.value === 'c') e.preventDefault()
		})

		engine.extensions.tabs.closeTab(b)

		expect(engine.extensions.activation.activeItem?.value).toBe('d')
	})
})

describe('Select: отменённый выбор — не выбор пользователя', () => {
	it('chooseItem отказывает, поле и панель остаются как были', () => {
		const owner = new TSelect({ value: 'a' })
		const collection = new TSelectCollectionFacade({}, { owner })

		collection.items = ABC.map(
			(props) => new TSelectItem({ ...props, text: props.value.toUpperCase() }),
		) as ISelectItem[]
		owner.open = true

		const choose = vi.fn()
		const select = collection.engine.extensions.select
		const option = collection.items[2]

		select.events.on('choose', choose)
		collection.engine.extensions.selection.events.on('item:select:before', (e) => {
			if (e.item === option) e.preventDefault()
		})

		expect(select.chooseItem(option)).toBe(false)
		expect(owner.value).toBe('a')
		expect(owner.field.value).toBe('A')
		expect(owner.open).toBe(true)
		expect(choose).not.toHaveBeenCalled()
	})
})
