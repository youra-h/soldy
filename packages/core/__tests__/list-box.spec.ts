/**
 * ListBox: проброс `view` со списка на элементы.
 *
 * Тестов на ListBox не было вовсе, а место непростое: `change:view` —
 * единственное во всём проекте событие, которое item-адаптер **добавляет** к
 * карте родителя. На нём сломалась типизация цепочки расширений, и он же
 * оказался единственным местом, где регрессия типов вообще видна компилятору.
 *
 * Поэтому здесь два разных страховочных слоя:
 *
 * - тип — `vue-tsc` в CI проходит по исходникам ядра транзитивно; сузь
 *   констрейнт обратно, и релей `['change:view']` перестанет компилироваться;
 *   опечатка в имени события — тоже;
 * - поведение — этот файл: событие действительно доходит и значение меняется.
 *
 * Одного типа мало: приведение к `any` глушит проверку молча, и до этих тестов
 * так и было.
 */

import { describe, it, expect } from 'vitest'
import {
	TListBox,
	TListBoxItem,
	TListBoxCollectionFacade,
	TListBoxItemCollectionFacade,
	TItemContextRegistry,
} from '../src'
import type { IListBoxItem } from '@soldy/core'

function createListBox(texts: string[], props: Record<string, unknown> = {}) {
	const owner = new TListBox(props as any)
	const collection = new TListBoxCollectionFacade({}, { owner })
	const items = texts.map((text) => new TListBoxItem({ value: text, text }))

	collection.items = items as IListBoxItem[]

	const registry = new TItemContextRegistry(collection.engine.getCore())

	/** Фасад элемента — через него разметка читает членство в коллекции. */
	const facadeFor = (index: number) => {
		const facade = new TListBoxItemCollectionFacade()

		facade.setContext(registry.get(items[index]) as any)

		return facade
	}

	return { owner, collection, items, facadeFor }
}

describe('view пробрасывается со списка на элемент', () => {
	it('элемент берёт вид владельца', () => {
		expect(createListBox(['a'], { view: 'filled' }).facadeFor(0).view).toBe('filled')
	})

	/**
	 * Тот самый релей. Без него элемент узнавал бы о смене вида только при
	 * пересоздании — то есть в живом интерфейсе не узнавал бы вовсе.
	 */
	it('смена вида у списка доходит до элемента событием', () => {
		const { owner, facadeFor } = createListBox(['a', 'b'], { view: 'plain' })
		const facade = facadeFor(0)
		const seen: unknown[] = []

		facade.events.on('change:view', (value: unknown) => seen.push(value))

		owner.view = 'filled'

		expect(seen).toEqual(['filled'])
		expect(facade.view).toBe('filled')
	})

	it('вид доходит до всех элементов, а не только до первого', () => {
		const { owner, facadeFor } = createListBox(['a', 'b', 'c'], { view: 'plain' })
		const facades = [facadeFor(0), facadeFor(1), facadeFor(2)]

		owner.view = 'filled'

		expect(facades.map((facade) => facade.view)).toEqual(['filled', 'filled', 'filled'])
	})
})

describe('wordWrap: значение элемента поверх значения списка', () => {
	it('без своего значения элемент берёт списочное', () => {
		expect(createListBox(['a'], { wordWrap: true }).facadeFor(0).wordWrap).toBe(true)
	})

	it('своё значение элемента перекрывает списочное', () => {
		const { items, facadeFor } = createListBox(['a'], { wordWrap: true })

		items[0].wordWrap = false

		expect(facadeFor(0).wordWrap).toBe(false)
	})
})
