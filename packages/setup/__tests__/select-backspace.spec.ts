// @vitest-environment jsdom

/**
 * Удаление выбранных тегов по `Backspace` в пустом поле Select — `TSelectBackspacePlugin`.
 *
 * Механизм включает `removeOnBackspace` и требует `editable` + `multiple`
 * разом. Первое нажатие `Backspace` в пустом поле только взводит счётчик,
 * второе и каждое следующее подряд снимает выбор с последнего тега. Любая
 * другая клавиша, непустое поле и автоповтор (`repeat`) счётчик не двигают —
 * первые два его сбрасывают, автоповтор не участвует вовсе.
 */

import { describe, it, expect, afterEach } from 'vitest'
import { createPluginContext } from './helpers'
import { TSelect, TSelectItem, TSelectCollectionFacade } from '@soldy/core'
import type { ISelectItem, ISelectProps } from '@soldy/core'
import { TSelectBackspacePlugin, TElementPlugin, TCollectionBundlesPlugin } from '@soldy/plugins'

const nextFrame = () => new Promise((resolve) => requestAnimationFrame(resolve))

/**
 * Собирает Select с коллекцией и настоящим `<input>` внутри корня — тем же
 * способом, что `select-editable.spec.ts`. Плагину не нужны ни клавиатура,
 * ни DOM-узлы опций: он работает только с полем и расширениями коллекции.
 */
async function setup(texts: string[], props: Partial<ISelectProps> = {}) {
	const owner = new TSelect({ editable: true, removeOnBackspace: true, ...props })
	const facade = new TSelectCollectionFacade({ mode: 'multiple' }, { owner })
	const items = texts.map((text) => new TSelectItem({ value: text.toLowerCase(), text }))

	facade.items = items as ISelectItem[]

	const root = document.createElement('div')
	const input = document.createElement('input')

	root.appendChild(input)
	document.body.appendChild(root)

	const rootElement = new TElementPlugin()
	const bundles = new TCollectionBundlesPlugin()
	const backspace = new TSelectBackspacePlugin()

	const ctx = createPluginContext(owner, [rootElement, bundles])

	bundles.install(ctx)
	backspace.install(ctx)

	bundles.bindEngine(facade.engine)

	rootElement.element = root
	await nextFrame()

	const choose = (item: ISelectItem) => facade.engine.extensions.select.chooseItem(item)

	const press = (key: string, init: KeyboardEventInit = {}) =>
		input.dispatchEvent(new KeyboardEvent('keydown', { key, bubbles: true, ...init }))

	const selectedValues = () =>
		facade.engine.extensions.selection.selected.map((item) => item.value)

	return { owner, facade, items, backspace, input, root, choose, press, selectedValues }
}

afterEach(() => {
	document.body.innerHTML = ''
})

describe('взвод по первому нажатию', () => {
	it('первый Backspace в пустом поле ничего не удаляет', async () => {
		const { items, choose, press, selectedValues } = await setup(['Москва', 'Тверь'])

		choose(items[0])
		choose(items[1])

		press('Backspace')

		expect(selectedValues()).toEqual([items[0].value, items[1].value])
	})

	it('второй Backspace подряд удаляет последний тег', async () => {
		const { items, choose, press, selectedValues } = await setup(['Москва', 'Тверь'])

		choose(items[0])
		choose(items[1])

		press('Backspace')
		press('Backspace')

		expect(selectedValues()).toEqual([items[0].value])
	})

	it('каждое следующее нажатие удаляет ещё по тегу', async () => {
		const { items, choose, press, selectedValues } = await setup(['Москва', 'Тверь', 'Тула'])

		choose(items[0])
		choose(items[1])
		choose(items[2])

		press('Backspace')
		press('Backspace')
		press('Backspace')

		expect(selectedValues()).toEqual([items[0].value])
	})
})

describe('что сбрасывает счётчик', () => {
	it('любая другая клавиша сбрасывает взвод', async () => {
		const { items, choose, press, selectedValues } = await setup(['Москва', 'Тверь'])

		choose(items[0])
		choose(items[1])

		press('Backspace')
		press('a')
		press('Backspace')

		expect(selectedValues()).toEqual([items[0].value, items[1].value])
	})

	it('Backspace при непустом поле не взводит и сбрасывает счётчик', async () => {
		const { items, choose, input, press, selectedValues } = await setup(['Москва', 'Тверь'])

		choose(items[0])
		choose(items[1])

		press('Backspace')
		input.value = 'т'
		press('Backspace')
		input.value = ''
		press('Backspace')

		// Взвод сбросило непустое поле — это нажатие снова только взводит
		expect(selectedValues()).toEqual([items[0].value, items[1].value])
	})

	it('автоповтор не считается — не взводит и не сбрасывает', async () => {
		const { items, choose, press, selectedValues } = await setup(['Москва', 'Тверь'])

		choose(items[0])
		choose(items[1])

		press('Backspace')
		press('Backspace', { repeat: true })
		press('Backspace', { repeat: true })

		// Оба автоповтора проигнорированы — до сих пор только первое взводило
		expect(selectedValues()).toEqual([items[0].value, items[1].value])

		press('Backspace')

		expect(selectedValues()).toEqual([items[0].value])
	})
})

describe('удаляется последний тег, а не первый выбранный', () => {
	it('удаляет тег, добавленный последним', async () => {
		const { items, choose, press, selectedValues } = await setup(['Москва', 'Тверь', 'Тула'])

		choose(items[1])
		choose(items[0])
		choose(items[2])

		press('Backspace')
		press('Backspace')

		expect(selectedValues()).toEqual([items[1].value, items[0].value])
	})
})

describe('слушатель — только когда все условия разом', () => {
	it('removeOnBackspace выключено — ничего не удаляется', async () => {
		const { items, choose, press, selectedValues } = await setup(['Москва', 'Тверь'], {
			removeOnBackspace: false,
		})

		choose(items[0])
		choose(items[1])

		press('Backspace')
		press('Backspace')

		expect(selectedValues()).toEqual([items[0].value, items[1].value])
	})

	it('select-only (editable: false) — ничего не удаляется', async () => {
		const { items, choose, press, selectedValues } = await setup(['Москва', 'Тверь'], {
			editable: false,
		})

		choose(items[0])
		choose(items[1])

		press('Backspace')
		press('Backspace')

		expect(selectedValues()).toEqual([items[0].value, items[1].value])
	})

	it('single — ничего не удаляется', async () => {
		const { owner, items, facade, press, selectedValues } = await setup(['Москва', 'Тверь'])

		facade.mode = 'single'
		facade.engine.extensions.select.chooseItem(items[0])

		expect(owner.field.value).toBe(items[0].text)

		press('Backspace')
		press('Backspace')

		expect(selectedValues()).toEqual([items[0].value])
	})

	it('включили removeOnBackspace на ходу — слушатель появляется', async () => {
		const { items, choose, owner, press, selectedValues } = await setup(['Москва', 'Тверь'], {
			removeOnBackspace: false,
		})

		choose(items[0])
		choose(items[1])

		owner.removeOnBackspace = true

		press('Backspace')
		press('Backspace')

		expect(selectedValues()).toEqual([items[0].value])
	})
})
