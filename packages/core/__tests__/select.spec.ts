/**
 * Select — поле выбора из списка.
 *
 * Наследует `TInputControl`, поэтому `value`/`name`/`readonly`/`required`
 * приходят готовыми. Своё — состояние панели. Коллекция живёт в параллельном
 * фасаде, как у Tabs: наследование от контрола ей не мешает.
 *
 * Главное здесь — что `value` и выбор в коллекции это одно и то же, а не два
 * состояния, которые надо не забыть согласовать.
 */

import { describe, it, expect, vi } from 'vitest'
import {
	TSelect,
	TSelectItem,
	TSelectCollectionFacade,
	TSelectItemCollectionFacade,
	TItemContextRegistry,
	TInput,
} from '@soldy/core'
import type { ISelectItem } from '@soldy/core'

function createSelect(values: string[], props: Record<string, unknown> = {}) {
	const owner = new TSelect(props as any)
	const collection = new TSelectCollectionFacade({}, { owner })
	const items = values.map((value) => new TSelectItem({ value, text: value.toUpperCase() }))

	collection.items = items as ISelectItem[]

	const registry = new TItemContextRegistry(collection.engine.getCore())

	/** Фасад опции — через него разметка выбирает элемент. */
	const facadeFor = (index: number) => {
		const facade = new TSelectItemCollectionFacade()

		facade.setContext(registry.get(items[index]) as any)

		return facade
	}

	return { owner, collection, items, facadeFor, select: collection.engine.extensions.select }
}

describe('TSelect — собственные props', () => {
	it('о коллекции ничего не знает', () => {
		const select = new TSelect()

		// Ни опций, ни выбора: это ответственность фасада
		expect('items' in select).toBe(false)
		expect('selected' in select).toBe(false)
	})

	it('объявляет себя как combobox', () => {
		const select = new TSelect()

		expect(select.aria.get('role')).toBe('combobox')
		expect(select.aria.get('aria-haspopup')).toBe('listbox')
		expect(select.aria.get('aria-expanded')).toBe('false')
	})

	it('aria-expanded следует за панелью', () => {
		const select = new TSelect()

		select.open = true

		expect(select.aria.get('aria-expanded')).toBe('true')
	})

	it('open эмитит change:open и парное событие', () => {
		const select = new TSelect()
		const seen: string[] = []

		select.events.on('open', () => seen.push('open'))
		select.events.on('close', () => seen.push('close'))
		select.events.on('change:open', (value) => seen.push(`change:${value}`))

		select.toggleOpen()
		select.toggleOpen()

		expect(seen).toEqual(['change:true', 'open', 'change:false', 'close'])
	})

	it('повтор того же значения событий не даёт', () => {
		const select = new TSelect({ open: true })
		const handler = vi.fn()

		select.events.on('change:open', handler)
		select.open = true

		expect(handler).not.toHaveBeenCalled()
	})
})

describe('когда панель открывать нельзя', () => {
	it('disabled не даёт открыть', () => {
		const select = new TSelect({ disabled: true })

		select.open = true

		expect(select.open).toBe(false)
	})

	it('readonly не даёт открыть: выбор из списка — единственный способ сменить значение', () => {
		const select = new TSelect({ readonly: true })

		select.open = true

		expect(select.open).toBe(false)
	})

	it('запрет закрывает уже открытую панель', () => {
		// Иначе open, выставленный до disabled, остался бы висеть
		const select = new TSelect({ open: true })

		expect(select.open).toBe(true)

		select.disabled = true

		expect(select.open).toBe(false)
	})

	it('disabled убирает поле из порядка обхода', () => {
		const select = new TSelect()

		expect(select.aria.get('tabindex')).toBe('0')

		select.disabled = true

		expect(select.aria.has('tabindex')).toBe(false)
	})
})

describe('clearAria — имя кнопки очистки', () => {
	it('собирается с именем поля, чтобы кнопки были различимы', () => {
		// На форме с пятью полями пять одинаковых «Clear, кнопка» в списке
		// элементов скринридера выбрать нельзя
		expect(new TSelect({ name: 'Город' }).clearAria['aria-label']).toBe('Clear Город')
	})

	it('без имени поля остаётся одно слово', () => {
		expect(new TSelect().clearAria['aria-label']).toBe('Clear')
	})

	it('слово переопределяется — язык интерфейса решает потребитель', () => {
		const select = new TSelect({ name: 'Город', clearLabel: 'Очистить' })

		expect(select.clearAria['aria-label']).toBe('Очистить Город')
	})

	it('отдельный набор: это имя соседней кнопки, а не самого поля', () => {
		expect(new TSelect({ name: 'Город' }).aria.has('aria-label')).toBe(false)
	})
})

describe('TSelectItem', () => {
	it('объявляет себя как option', () => {
		expect(new TSelectItem().aria.get('role')).toBe('option')
	})

	it('связки с полем в ядре нет — о ней знает коллекция', () => {
		const item = new TSelectItem({ value: 'a', text: 'A' })

		expect(item.aria.has('id')).toBe(false)
		expect(item.aria.has('aria-selected')).toBe(false)
	})
})

describe('value и выбор — одно и то же', () => {
	it('выбор опции пишет value', () => {
		const { owner, facadeFor } = createSelect(['a', 'b'])

		facadeFor(1).choose()

		expect(owner.value).toBe('b')
	})

	it('value выбирает опцию', () => {
		const { owner, collection, items } = createSelect(['a', 'b'])

		owner.value = 'b'

		expect(collection.selected).toEqual([items[1]])
	})

	it('value, заданный до появления опций, применяется при их добавлении', () => {
		const owner = new TSelect({ value: 'b' })
		const collection = new TSelectCollectionFacade({}, { owner })

		collection.items = [
			new TSelectItem({ value: 'a', text: 'A' }),
			new TSelectItem({ value: 'b', text: 'B' }),
		] as ISelectItem[]

		expect(collection.selected).toHaveLength(1)
		expect(collection.selected[0].value).toBe('b')
	})

	it('в multiple value — массив', () => {
		const { owner, collection, facadeFor } = createSelect(['a', 'b', 'c'])

		collection.mode = 'multiple'
		facadeFor(0).choose()
		facadeFor(2).choose()

		expect(owner.value).toEqual(['a', 'c'])
	})

	it('в multiple повторный выбор снимает', () => {
		const { owner, collection, facadeFor } = createSelect(['a', 'b'])

		collection.mode = 'multiple'
		facadeFor(0).choose()
		facadeFor(0).choose()

		expect(owner.value).toEqual([])
	})

	it('в single выбор заменяет прежний', () => {
		const { owner, collection, facadeFor } = createSelect(['a', 'b'])

		facadeFor(0).choose()
		facadeFor(1).choose()

		expect(owner.value).toBe('b')
		expect(collection.selected).toHaveLength(1)
	})

	it('disabled-опция не выбирается', () => {
		const { owner, items, facadeFor } = createSelect(['a', 'b'])

		items[1].disabled = true
		facadeFor(1).choose()

		expect(owner.value).toBeUndefined()
	})

	it('clear снимает выбор и обнуляет value', () => {
		const { owner, collection, facadeFor } = createSelect(['a', 'b'])

		facadeFor(0).choose()
		collection.clear()

		expect(collection.selected).toEqual([])
		expect(owner.value).toBeUndefined()
	})

	it('синхронизация не зацикливается', () => {
		// Выбор пишет value, value выбирает — без флага это был бы вечный круг
		const { owner, facadeFor } = createSelect(['a', 'b'])
		const handler = vi.fn()

		owner.events.on('change:value', handler)
		facadeFor(0).choose()

		expect(handler).toHaveBeenCalledTimes(1)
	})
})

describe('панель после выбора', () => {
	it('closeOnSelect закрывает', () => {
		const { owner, facadeFor } = createSelect(['a'], { open: true })

		facadeFor(0).choose()

		expect(owner.open).toBe(false)
	})

	it('без closeOnSelect остаётся открытой — так нужно для multiple', () => {
		const { owner, collection, facadeFor } = createSelect(['a', 'b'], {
			open: true,
			closeOnSelect: false,
		})

		collection.mode = 'multiple'
		facadeFor(0).choose()

		expect(owner.open).toBe(true)
	})

	it('в multiple выбор не закрывает панель даже с closeOnSelect по умолчанию', () => {
		const { owner, collection, facadeFor } = createSelect(['a', 'b'], { open: true })

		collection.mode = 'multiple'
		facadeFor(0).choose()

		expect(owner.open).toBe(true)
	})

	it('в multiple повторный выбор той же опции тоже не закрывает', () => {
		const { owner, collection, facadeFor } = createSelect(['a'], { open: true })

		collection.mode = 'multiple'
		facadeFor(0).choose()
		facadeFor(0).choose()

		expect(owner.open).toBe(true)
	})

	it('в single выбор по-прежнему закрывает', () => {
		const { owner, facadeFor } = createSelect(['a', 'b'], { open: true })

		facadeFor(0).choose()

		expect(owner.open).toBe(false)
	})
})

describe('связка ARIA поле ↔ список ↔ опция', () => {
	it('поле ссылается на список', () => {
		const { owner, select } = createSelect(['a'])

		expect(owner.aria.get('aria-controls')).toBe(select.listId)
	})

	it('опция получает id при добавлении в коллекцию', () => {
		const { items, select } = createSelect(['a'])

		expect(items[0].aria.get('id')).toBe(select.optionId(items[0]))
	})

	it('формула идентификаторов одна на обе стороны', () => {
		// Разнеси её по двум местам — и половинки однажды разойдутся
		const { items, facadeFor, select } = createSelect(['a'])

		expect(facadeFor(0).context.adapters.select.optionId).toBe(select.optionId(items[0]))
	})

	it('id уникальны между двумя Select на странице', () => {
		const first = createSelect(['a'])
		const second = createSelect(['a'])

		expect(first.owner.aria.get('aria-controls')).not.toBe(
			second.owner.aria.get('aria-controls'),
		)
		expect(first.items[0].aria.get('id')).not.toBe(second.items[0].aria.get('id'))
	})

	it('aria-selected стоит на всех опциях, а не только на выбранной', () => {
		// Скринридер объявляет «2 из 3, не выбрана» — для этого нужен атрибут
		const { items, facadeFor } = createSelect(['a', 'b', 'c'])

		facadeFor(1).choose()

		expect(items[0].aria.get('aria-selected')).toBe('false')
		expect(items[1].aria.get('aria-selected')).toBe('true')
		expect(items[2].aria.get('aria-selected')).toBe('false')
	})

	it('список объявлен как listbox', () => {
		expect(createSelect(['a']).collection.list_aria.role).toBe('listbox')
	})

	it('aria-multiselectable появляется только в multiple', () => {
		const { collection } = createSelect(['a'])

		expect(collection.list_aria['aria-multiselectable']).toBeNull()

		collection.mode = 'multiple'

		expect(collection.list_aria['aria-multiselectable']).toBe('true')
	})
})

describe('valueText — что показывает поле', () => {
	it('пуст, пока ничего не выбрано', () => {
		expect(createSelect(['a']).collection.valueText).toBe('')
	})

	it('текст выбранной опции, а не её значение', () => {
		const { collection, facadeFor } = createSelect(['a'])

		facadeFor(0).choose()

		expect(collection.valueText).toBe('A')
	})

	it('в multiple пуст — текст выбранных рисуют теги, а не поле', () => {
		// До тегов (см. describe('теги в multiple')) поле показывало список
		// текстом («A, C»); теперь то же самое показывают теги в поле, и
		// повторять текстом было бы дублем
		const { collection, facadeFor } = createSelect(['a', 'b', 'c'])

		collection.mode = 'multiple'
		facadeFor(0).choose()
		facadeFor(2).choose()

		expect(collection.valueText).toBe('')
	})

	it('следует за текстом опции', () => {
		const { collection, items, facadeFor } = createSelect(['a'])

		facadeFor(0).choose()
		items[0].text = 'Другое'

		expect(collection.valueText).toBe('Другое')
	})
})

describe('id элемента формы', () => {
	/**
	 * Живёт в `TInputControl`, а не в Select: на поле ссылаются `<label for>`,
	 * `aria-labelledby` и `aria-describedby` у текста ошибки — это нужно любому
	 * форменному контролу.
	 */
	it('пустой проп означает «сгенерируй сам» — берётся uid', () => {
		const select = new TSelect()

		expect(select.id).toBe(String(select.uid))
	})

	it('заданный снаружи побеждает', () => {
		expect(new TSelect({ id: 'city' }).id).toBe('city')
	})

	it('меняется через instance и сообщает об этом', () => {
		const select = new TSelect()
		const seen: string[] = []

		select.events.on('change:id', (value) => seen.push(value))
		select.id = 'city'

		expect(select.id).toBe('city')
		expect(seen).toEqual(['city'])
	})

	it('снятие возвращает к uid', () => {
		const select = new TSelect({ id: 'city' })

		select.id = ''

		expect(select.id).toBe(String(select.uid))
	})

	it('getProps отдаёт заданное значение, а не производное', () => {
		// Иначе assign() перенёс бы чужой uid на другой экземпляр
		const select = new TSelect()

		expect(select.getProps().id).toBe('')
	})

	it('есть у всех форменных контролов, не только у Select', () => {
		const input = new TInput()

		expect(input.id).toBe(String(input.uid))
	})
})

/**
 * `indicator` у Select устроен так же, как у ListBox: сторона одна на всё поле,
 * опция читает её у него. Копия сознательная — общего предка у списка и поля
 * быть не может, сверяет её `list-contract.spec.ts`.
 */
describe('indicator пробрасывается с поля на опцию', () => {
	it('по умолчанию отметки нет', () => {
		expect(createSelect(['a']).facadeFor(0).indicator).toBe('none')
	})

	it('опция берёт сторону у поля', () => {
		expect(createSelect(['a'], { indicator: 'start' }).facadeFor(0).indicator).toBe('start')
	})

	it('смена стороны доходит до опции событием', () => {
		const { owner, facadeFor } = createSelect(['a', 'b'])
		const facade = facadeFor(0)
		const seen: unknown[] = []

		facade.events.on('change:indicator', (value: unknown) => seen.push(value))

		owner.indicator = 'end'

		expect(seen).toEqual(['end'])
		expect(facade.indicator).toBe('end')
	})

	it('data-indicator стоит у опций сразу и переставляется при смене', () => {
		const { owner, items } = createSelect(['a', 'b'], { indicator: 'start' })

		expect(items.map((item) => item.dataset.get('indicator'))).toEqual(['start', 'start'])

		owner.indicator = 'end'

		expect(items.map((item) => item.dataset.get('indicator'))).toEqual(['end', 'end'])
	})
})

/**
 * Теги в поле при множественном выборе — второй компонент со своей
 * коллекцией (`TSelectTagsExtension`), а не разметка: связка «опция ⇄ тег»
 * иначе повторилась бы в каждом из шести адаптеров.
 */
describe('теги в multiple', () => {
	it('в single тегов нет', () => {
		expect(createSelect(['a', 'b']).collection.tags).toBeNull()
	})

	it('появляются, как только режим переключён на multiple', () => {
		const { collection } = createSelect(['a', 'b'])

		collection.mode = 'multiple'

		expect(collection.tags).not.toBeNull()
		expect(collection.tags_engine).not.toBeNull()
	})

	it('выбор опции даёт тег с её текстом', () => {
		const { collection, facadeFor } = createSelect(['a', 'b'])

		collection.mode = 'multiple'
		facadeFor(0).choose()
		facadeFor(1).choose()

		expect([...collection.tags_engine!.driver].map((item) => item.text)).toEqual(['A', 'B'])
	})

	it('снятие выбора убирает тег', () => {
		const { collection, facadeFor } = createSelect(['a', 'b'])

		collection.mode = 'multiple'
		facadeFor(0).choose()
		facadeFor(0).choose() // повторный выбор в multiple снимает

		expect([...collection.tags_engine!.driver]).toHaveLength(0)
	})

	it('закрытие тега снимает выбор с опции по value', () => {
		const { collection, items, facadeFor } = createSelect(['a', 'b'])

		collection.mode = 'multiple'
		facadeFor(0).choose()
		facadeFor(1).choose()

		const engine = collection.tags_engine!
		const tag = [...engine.driver][0]

		engine.extensions.tags.closeTag(tag)

		expect(collection.selected).toEqual([items[1]])
	})

	it('disabled поля гасит closable тегов', () => {
		const { owner, collection, facadeFor } = createSelect(['a'])

		collection.mode = 'multiple'
		facadeFor(0).choose()
		owner.disabled = true

		const tag = [...collection.tags_engine!.driver][0]

		expect(tag.closable).toBe(false)
	})

	it('valueText пуст, пока теги есть, — текст рисуют они', () => {
		const { collection, facadeFor } = createSelect(['a', 'b'])

		collection.mode = 'multiple'
		facadeFor(0).choose()

		expect(collection.valueText).toBe('')
	})
})
