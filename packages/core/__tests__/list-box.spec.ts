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

/**
 * `value` списка — проекция выбора, а не второе состояние.
 *
 * До этого выбор отдавался наружу только как `selected: TItem[]` — внутренней
 * моделью коллекции. Потребитель на вопрос «что выбрано» получал объекты и
 * должен был сам приводить их к значениям; в стенде это привело к тому, что
 * меню полезло управлять выбором поэлементно.
 *
 * Связь держит `TValueSelectionExtension` — то же расширение, что у Select:
 * оно и было там написано, пока Select оставался единственным списком со
 * значением.
 */
describe('value ↔ выбор', () => {
	it('значение выбирает элемент', () => {
		const { owner, collection, items } = createListBox(['a', 'b', 'c'])

		owner.value = 'b'

		expect(collection.selected).toEqual([items[1]])
	})

	it('выбор элемента пишет значение', () => {
		const { owner, collection, items } = createListBox(['a', 'b', 'c'])

		collection.engine.extensions.selection.select(items[2])

		expect(owner.value).toBe('c')
	})

	it('в multiple значение — массив', () => {
		const { owner, collection, items } = createListBox(['a', 'b', 'c'])

		collection.mode = 'multiple'
		collection.engine.extensions.selection.select(items[0])
		collection.engine.extensions.selection.select(items[2])

		expect(owner.value).toEqual(['a', 'c'])
	})

	it('снятие выбора обнуляет значение', () => {
		const { owner, collection, items } = createListBox(['a', 'b'])

		owner.value = 'a'
		collection.engine.extensions.selection.resetSelection()

		expect(owner.value).toBeUndefined()
	})

	/**
	 * Значение приходит пропом сразу, а элементы регистрируются при
	 * монтировании — то есть позже. Без повторного прохода на `item:added`
	 * заданное значение молча терялось бы.
	 */
	it('значение, заданное до появления элементов, применяется при их добавлении', () => {
		const owner = new TListBox({ value: 'b' } as any)
		const collection = new TListBoxCollectionFacade({}, { owner })

		expect(owner.value).toBe('b')

		collection.items = [
			new TListBoxItem({ value: 'a', text: 'a' }),
			new TListBoxItem({ value: 'b', text: 'b' }),
		] as IListBoxItem[]

		expect(collection.selected.map((item) => item.value)).toEqual(['b'])
	})

	/** Синхронизация в обе стороны — самое место для бесконечного цикла. */
	it('не зацикливается', () => {
		const { owner, collection, items } = createListBox(['a', 'b'])
		let changes = 0

		owner.events.on('change:value', () => changes++)
		collection.engine.extensions.selection.select(items[1])

		expect(owner.value).toBe('b')
		expect(changes).toBeLessThan(5)
	})
})

/**
 * `indicator` — отметка выбранного элемента.
 *
 * Свойство списка, не элемента: у элемента своей стороны нет, иначе отметки в
 * одном списке разъехались бы. Вниз доезжает тем же путём, что `view`, а в
 * тему — как `data-indicator` на каждом элементе.
 */
describe('indicator пробрасывается со списка на элемент', () => {
	it('по умолчанию отметки нет', () => {
		expect(createListBox(['a']).facadeFor(0).indicator).toBe('none')
	})

	it('элемент берёт сторону у владельца', () => {
		expect(createListBox(['a'], { indicator: 'end' }).facadeFor(0).indicator).toBe('end')
	})

	it('смена стороны доходит до элемента событием', () => {
		const { owner, facadeFor } = createListBox(['a', 'b'])
		const facade = facadeFor(0)
		const seen: unknown[] = []

		facade.events.on('change:indicator', (value: unknown) => seen.push(value))

		owner.indicator = 'start'

		expect(seen).toEqual(['start'])
		expect(facade.indicator).toBe('start')
	})

	/**
	 * Атрибут ставит родительское расширение, а не item-адаптер: адаптеры
	 * создаются лениво, а `data-indicator` обязан стоять с первой отрисовки —
	 * включая серверную, где фасада может и не быть.
	 */
	it('data-indicator стоит у элементов сразу, без обращения к фасаду', () => {
		const { items } = createListBox(['a', 'b'], { indicator: 'start' })

		expect(items.map((item) => item.dataset.get('indicator'))).toEqual(['start', 'start'])
	})

	it('смена стороны переставляет data-indicator всем элементам', () => {
		const { owner, items } = createListBox(['a', 'b', 'c'], { indicator: 'start' })

		owner.indicator = 'end'

		expect(items.map((item) => item.dataset.get('indicator'))).toEqual(['end', 'end', 'end'])
	})

	it('элемент, добавленный позже, получает текущую сторону', () => {
		const { owner, collection, items } = createListBox(['a'], { indicator: 'start' })

		owner.indicator = 'end'

		const late = new TListBoxItem({ value: 'z', text: 'z' })

		collection.items = [...items, late] as IListBoxItem[]

		expect(late.dataset.get('indicator')).toBe('end')
	})
})

/**
 * Roving tabindex (APG listbox): элементы фокусируются только стрелками
 * (`TListKeyboardPlugin`), Tab не должен по ним переходить. Ставит родительское
 * расширение, а не item-адаптер — атрибут обязан стоять с первой отрисовки.
 */
describe('tabindex у элементов', () => {
	it('элементы, добавленные в коллекцию, получают tabindex="-1"', () => {
		const { items } = createListBox(['a', 'b'])

		expect(items.map((item) => item.aria.get('tabindex'))).toEqual(['-1', '-1'])
	})

	it('элемент, добавленный позже, тоже получает tabindex="-1"', () => {
		const { collection, items } = createListBox(['a'])
		const late = new TListBoxItem({ value: 'z', text: 'z' })

		collection.items = [...items, late] as IListBoxItem[]

		expect(late.aria.get('tabindex')).toBe('-1')
	})
})
