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
	isSwipeable,
} from '@soldy-ui/core'
import type {
	ISelectItem,
	ISelectProps,
	TSelectPanelPlacement,
	TSelectPlacement,
} from '@soldy-ui/core'

function createSelect(values: string[], props: Partial<ISelectProps> = {}) {
	const owner = new TSelect(props)
	const collection = new TSelectCollectionFacade({}, { owner })
	const items = values.map((value) => new TSelectItem({ value, text: value.toUpperCase() }))

	collection.items = items as ISelectItem[]

	const registry = new TItemContextRegistry(collection.engine.getCore())

	/** Фасад опции — через него разметка выбирает элемент. */
	const facadeFor = (index: number) => {
		const facade = new TSelectItemCollectionFacade()

		facade.setContext(registry.get(items[index]))

		return facade
	}

	return { owner, collection, items, facadeFor, select: collection.engine.extensions.select }
}

/** Движок тегов: есть только в multiple, без него проверять нечего. */
function tagsEngine(collection: TSelectCollectionFacade) {
	const engine = collection.tags_engine

	if (!engine) throw new Error('движка тегов нет')

	return engine
}

/** Новая выдача вместо прежней — так приложение отдаёт результат поиска. */
function patchOptions(
	collection: TSelectCollectionFacade,
	sources: { value: string; text: string }[],
) {
	const batch = collection.extensions.batch

	batch.trackBy = (item) => item.value
	batch.patch(sources)
}

/**
 * Три способа убрать первую опцию из списка. Для расширения тегов они
 * различаются только тем, какие события приходят по пути, — результат обязан
 * быть один.
 */
const REMOVE_FIRST_OPTION: [
	string,
	(collection: TSelectCollectionFacade, items: ISelectItem[]) => void,
][] = [
	['удалением', (collection, items) => collection.extensions.batch.remove([items[0]])],
	[
		'патчем без новых опций',
		(collection) => patchOptions(collection, [{ value: 'b', text: 'B' }]),
	],
	[
		'патчем с новой опцией',
		(collection) =>
			patchOptions(collection, [
				{ value: 'b', text: 'B' },
				{ value: 'c', text: 'C' },
			]),
	],
]

describe('TSelect — собственные props', () => {
	it('о коллекции ничего не знает', () => {
		const select = new TSelect()

		// Ни опций, ни выбора: это ответственность фасада
		expect('items' in select).toBe(false)
		expect('selected' in select).toBe(false)
	})

	it('объявляет себя как combobox — на поле, не на себе', () => {
		const select = new TSelect()

		expect(select.field.aria.get('role')).toBe('combobox')
		expect(select.field.aria.get('aria-haspopup')).toBe('listbox')
		expect(select.field.aria.get('aria-expanded')).toBe('false')
	})

	it('в собственном aria Select нет role и aria-expanded — паттерн описывает поле', () => {
		const select = new TSelect()

		expect(select.aria.has('role')).toBe(false)
		expect(select.aria.has('aria-expanded')).toBe(false)
	})

	it('aria-expanded на поле следует за панелью', () => {
		const select = new TSelect()

		select.open = true

		expect(select.field.aria.get('aria-expanded')).toBe('true')
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

	it('readonly открыть не мешает: он про ввод текста, а не про выбор из списка', () => {
		// select-only (`editable: false`) — это и есть readonly=true,
		// и панель для него единственный способ сменить значение
		const select = new TSelect({ readonly: true })

		select.open = true

		expect(select.open).toBe(true)
	})

	it('запрет закрывает уже открытую панель', () => {
		// Иначе open, выставленный до disabled, остался бы висеть
		const select = new TSelect({ open: true })

		expect(select.open).toBe(true)

		select.disabled = true

		expect(select.open).toBe(false)
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

	/**
	 * Кнопку очистки рисует поле, и очищают поле: Select слышит его событие
	 * `clear` и снимает выбор. Своей команды очистки у Select и его фасада нет —
	 * путь один и у встроенной кнопки, и у своей в слоте.
	 */
	it('очистка поля снимает выбор и обнуляет value', () => {
		const { owner, collection, facadeFor } = createSelect(['a', 'b'])

		facadeFor(0).choose()
		owner.field.clear()

		expect(collection.selected).toEqual([])
		expect(owner.value).toBeUndefined()
		expect(owner.field.value).toBe('')
	})

	/**
	 * В `multiple` поле пусто и при выбранных тегах: шаг очистки поля значения
	 * не меняет, а событие `clear` приходит всё равно — и снимает теги.
	 */
	it('в multiple очистка пустого поля снимает весь выбор', () => {
		const { owner, collection, facadeFor } = createSelect(['a', 'b'])

		collection.mode = 'multiple'
		facadeFor(0).choose()
		facadeFor(1).choose()

		expect(owner.field.value).toBe('')

		owner.field.clear()

		expect(collection.selected).toEqual([])
		expect(owner.value).toEqual([])
		expect(collection.tags_engine?.extensions.batch.items).toEqual([])
	})

	/**
	 * Разметка отдаёт `clear` в scope слота `clear` без инстанса, и содержимое
	 * слота зовёт его голой функцией. Метод прототипа терял там `this`: вызов
	 * падал с TypeError, и своя кнопка очистки выбора не снимала.
	 */
	it('clear, взятый у поля без инстанса, тоже снимает выбор', () => {
		const { owner, collection, facadeFor } = createSelect(['a', 'b'])
		const { clear } = owner.field

		facadeFor(0).choose()
		clear()

		expect(collection.selected).toEqual([])
		expect(owner.value).toBeUndefined()
	})

	it('своей команды очистки у фасада нет', () => {
		const { collection } = createSelect(['a'])

		expect('clear' in collection).toBe(false)
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

/**
 * `id` списка и опций и ссылки на них — `aria-controls` поля и
 * `aria-activedescendant` — ядро не пишет: `id` нужны документу, их пишут
 * плагины связок (plugins, ids.plugin.spec). У ядра — роли, выбор и
 * многовыборность списка.
 */
describe('ARIA поля, списка и опций', () => {
	it('id и ссылок на них у ядра нет', () => {
		const { owner, items } = createSelect(['a'])

		expect(owner.field.aria.has('aria-controls')).toBe(false)
		expect(owner.listAria.has('id')).toBe(false)
		expect(items[0].aria.has('id')).toBe(false)
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
		expect(createSelect(['a']).owner.listAria.get('role')).toBe('listbox')
	})

	it('aria-multiselectable появляется только в multiple', () => {
		const { owner, collection } = createSelect(['a'])

		expect(owner.listAria.has('aria-multiselectable')).toBe(false)

		collection.mode = 'multiple'

		expect(owner.listAria.get('aria-multiselectable')).toBe('true')

		collection.mode = 'single'

		expect(owner.listAria.has('aria-multiselectable')).toBe(false)
	})

	it('change:listAria — на смену набора списка', () => {
		const { owner, collection } = createSelect(['a'])
		const changes = vi.fn()

		owner.events.on('change:listAria', changes)
		collection.mode = 'multiple'

		expect(changes).toHaveBeenCalledWith({ role: 'listbox', 'aria-multiselectable': 'true' })
	})
})

describe('text — что показывает поле', () => {
	it('пуст, пока ничего не выбрано', () => {
		expect(createSelect(['a']).owner.field.value).toBe('')
	})

	it('текст выбранной опции, а не её значение', () => {
		const { owner, facadeFor } = createSelect(['a'])

		facadeFor(0).choose()

		expect(owner.field.value).toBe('A')
	})

	it('в multiple пуст — текст выбранных рисуют теги, а не поле', () => {
		// До тегов (см. describe('теги в multiple')) поле показывало список
		// текстом («A, C»); теперь то же самое показывают теги в поле, и
		// повторять текстом было бы дублем
		const { owner, collection, facadeFor } = createSelect(['a', 'b', 'c'])

		collection.mode = 'multiple'
		facadeFor(0).choose()
		facadeFor(2).choose()

		expect(owner.field.value).toBe('')
	})

	it('переименовали выбранную опцию — field.value обновился', () => {
		// Раньше `_onItemAdded` пересчитывал только текст, а `field.value` у
		// уже выбранной опции переименование не замечал
		const { owner, items, facadeFor } = createSelect(['a'])

		facadeFor(0).choose()
		items[0].text = 'Другое'

		expect(owner.field.value).toBe('Другое')
	})
})

/**
 * Переименование опции доходит до поля, только пока она выбрана: текст
 * невыбранной в поле не виден. Раньше каждый `change:text` переписывал поле
 * текстом выбранного, и набранное в `editable` пропадало, стоило приложению
 * обновить тексты опций во время ввода — так делает серверный поиск с
 * `trackBy`: патч переименовывает опции сеттером `text`.
 */
describe('переименование опции', () => {
	/**
	 * Сколько подписок на `change:text` висит на опции — считая с вызова, поэтому
	 * ставится до того, как опция попадёт в список.
	 *
	 * Удаление и возврат проверяются числом подписок, а не итоговым
	 * `field.value`: переименование опции вне выбора поле не трогает, и утечку
	 * поле не показало бы.
	 */
	function watchTextListeners(item: ISelectItem): () => number {
		const on = vi.spyOn(item.events, 'on')
		const off = vi.spyOn(item.events, 'off')
		const count = (calls: ReadonlyArray<readonly unknown[]>) =>
			calls.filter(([event]) => event === 'change:text').length

		return () => count(on.mock.calls) - count(off.mock.calls)
	}

	it('невыбранной — набранный текст остаётся, текст выбранного тоже', () => {
		const { owner, items, facadeFor, select } = createSelect(['a', 'b'], { editable: true })

		facadeFor(0).choose()
		owner.field.value = 'typed'
		items[1].text = 'B2'

		expect(owner.field.value).toBe('typed')
		expect(select.text).toBe('A')
	})

	it('когда не выбрано ничего — набранный текст остаётся', () => {
		const { owner, items } = createSelect(['a', 'b'], { editable: true })

		owner.field.value = 'typed'
		items[1].text = 'B2'

		expect(owner.field.value).toBe('typed')
	})

	it('удалённую опцию Select больше не слушает', () => {
		const { collection, items } = createSelect(['a'])
		const late = new TSelectItem({ value: 'z', text: 'Z' })
		const listeners = watchTextListeners(late)

		collection.items = [...items, late]

		expect(listeners()).toBe(1)

		collection.engine.extensions.batch.remove([late])

		expect(listeners()).toBe(0)
	})

	it('после очистки списка опции не слушаются', () => {
		const { collection, items } = createSelect(['a'])
		const late = new TSelectItem({ value: 'z', text: 'Z' })
		const listeners = watchTextListeners(late)

		collection.items = [...items, late]
		collection.engine.extensions.batch.clear()

		expect(listeners()).toBe(0)
	})

	/**
	 * Без `trackBy` состав пересобирается через очистку: опции уходят и
	 * возвращаются теми же инстансами. Раньше каждое возвращение добавляло
	 * опции ещё одну подписку.
	 */
	it('возврат в список второй подписки не заводит', () => {
		const { collection, items } = createSelect(['a'])
		const late = new TSelectItem({ value: 'z', text: 'Z' })
		const listeners = watchTextListeners(late)
		const all = [...items, late]

		collection.items = all
		collection.items = [...all]
		collection.items = [...all]

		expect(listeners()).toBe(1)
	})

	it('выбранная опция, вернувшаяся в список, слушается снова', () => {
		const { owner, collection, items, facadeFor } = createSelect(['a', 'b'])

		facadeFor(0).choose()
		collection.items = [...items]
		items[0].text = 'Другое'

		expect(owner.field.value).toBe('Другое')
	})
})

/**
 * Поле пишут два пути (AGENTS.md, «Поле — один хранитель, не проп ядра»).
 * Выбор пользователя — `chooseItem` и `clear` — переписывает поле всегда и шлёт
 * `choose`. Остальное — смена состава и `value`, переименование выбранной,
 * снятие выбора закрытием тега — пересчитывает `text`, а поле трогает, только
 * пока оно показывает текст выбранного. Раньше каждое удаление опции, даже
 * невыбранной, переписывало поле, и при серверном поиске набранное пропадало
 * на каждом ответе.
 *
 * Набор здесь — запись в `owner.field.value`: так его пишет `TInputPlugin`.
 */
describe('набранное в поле и смена списка', () => {
	/** Editable single: выбрана «A», поверх набран текст. */
	function typedOverSelected() {
		const select = createSelect(['a', 'b', 'c'], { editable: true })

		select.facadeFor(0).choose()
		select.owner.field.value = 'typed'

		return select
	}

	describe('набранное остаётся, text свежий', () => {
		it('удалили невыбранную опцию', () => {
			const { owner, collection, items, select } = typedOverSelected()

			collection.engine.extensions.batch.remove([items[1]])

			expect(owner.field.value).toBe('typed')
			expect(select.text).toBe('A')
		})

		it('удалили выбранную опцию', () => {
			const { owner, collection, items, select } = typedOverSelected()

			collection.engine.extensions.batch.remove([items[0]])

			expect(owner.field.value).toBe('typed')
			expect(select.text).toBe('')
		})

		/**
		 * Без `trackBy` состав пересобирается через очистку: выбор снимается и
		 * ставится заново по `value` — тем же `change:selection`, что приходит
		 * на выбор пользователя.
		 */
		it('пересобрали items без trackBy при выставленном value', () => {
			const { owner, collection, items, select } = typedOverSelected()

			collection.items = [...items]

			expect(owner.value).toBe('a')
			expect(owner.field.value).toBe('typed')
			expect(select.text).toBe('A')
		})

		it('переименовали выбранную опцию', () => {
			const { owner, items, select } = typedOverSelected()

			items[0].text = 'Другое'

			expect(owner.field.value).toBe('typed')
			expect(select.text).toBe('Другое')
		})

		it('сменили value из кода', () => {
			const { owner, select } = typedOverSelected()

			owner.value = 'b'

			expect(owner.field.value).toBe('typed')
			expect(select.text).toBe('B')
		})
	})

	describe('выбор пользователя набранное переписывает', () => {
		it('chooseItem — текстом выбранной опции', () => {
			const { owner, facadeFor } = typedOverSelected()

			facadeFor(1).choose()

			expect(owner.field.value).toBe('B')
		})

		it('chooseItem уже выбранной опции — её текстом, хотя выбор не изменился', () => {
			const { owner, facadeFor } = typedOverSelected()

			facadeFor(0).choose()

			expect(owner.field.value).toBe('A')
		})

		it('очистка поля — пустотой', () => {
			const { owner } = typedOverSelected()

			owner.field.clear()

			expect(owner.field.value).toBe('')
		})

		it('очистка поля без выбора тоже стирает набранное', () => {
			const { owner } = createSelect(['a'], { editable: true })

			owner.field.value = 'typed'
			owner.field.clear()

			expect(owner.field.value).toBe('')
		})
	})

	/** Когда в поле не печатают, оно следует за выбранным, как и прежде. */
	describe('без набора поле показывает свежий текст выбранного', () => {
		it('удалили выбранную опцию — поле пусто', () => {
			const { owner, collection, items, facadeFor } = createSelect(['a', 'b'], {
				editable: true,
			})

			facadeFor(0).choose()
			collection.engine.extensions.batch.remove([items[0]])

			expect(owner.field.value).toBe('')
		})

		it('пересобрали items без trackBy — текст выбранного на месте', () => {
			const { owner, collection, items, facadeFor } = createSelect(['a', 'b'], {
				editable: true,
			})

			facadeFor(0).choose()
			collection.items = [...items]

			expect(owner.field.value).toBe('A')
		})

		it('сменили value из кода — текст новой', () => {
			const { owner, facadeFor } = createSelect(['a', 'b'], { editable: true })

			facadeFor(0).choose()
			owner.value = 'b'

			expect(owner.field.value).toBe('B')
		})
	})

	describe('multiple', () => {
		it('набранное переживает закрытие тега', () => {
			const { owner, collection, items, facadeFor, select } = createSelect(['a', 'b'], {
				editable: true,
			})

			collection.mode = 'multiple'
			facadeFor(0).choose()
			facadeFor(1).choose()
			owner.field.value = 'typed'

			const engine = tagsEngine(collection)

			engine.extensions.tags.closeTag([...engine.extensions.batch.items][0])

			expect(collection.selected).toEqual([items[1]])
			expect(owner.field.value).toBe('typed')
			expect(select.text).toBe('B')
		})

		it('chooseItem набранное стирает', () => {
			const { owner, collection, facadeFor } = createSelect(['a', 'b'], { editable: true })

			collection.mode = 'multiple'
			owner.field.value = 'typed'
			facadeFor(0).choose()

			expect(owner.field.value).toBe('')
		})

		/** Выбранное в `multiple` показывают теги, поэтому переименование идёт в них, а не в поле. */
		it('переименование выбранной опции набранное оставляет, а тег обновляет', () => {
			const { owner, collection, items, facadeFor, select } = createSelect(['a', 'b'], {
				editable: true,
			})

			collection.mode = 'multiple'
			facadeFor(0).choose()
			owner.field.value = 'typed'
			items[0].text = 'Другое'

			expect(owner.field.value).toBe('typed')
			expect(select.text).toBe('Другое')
			expect(tagsEngine(collection).extensions.batch.items.map((item) => item.text)).toEqual([
				'Другое',
			])
		})
	})

	/**
	 * `choose` — факт выбора пользователя. По `change:selection` его не
	 * отличить: тот приходит и на смену `value` и состава. Слушает
	 * `TEditablePlugin` — сбрасывает набранное и отбор.
	 */
	describe('choose', () => {
		it('chooseItem и очистка поля шлют его, когда поле уже записано', () => {
			const { owner, facadeFor, select } = createSelect(['a', 'b'], {
				editable: true,
			})
			const seen: string[] = []

			select.events.on('choose', () => seen.push(owner.field.value))

			owner.field.value = 'typed'
			facadeFor(1).choose()
			owner.field.value = 'typed'
			owner.field.clear()

			expect(seen).toEqual(['B', ''])
		})

		it('disabled-опция, смена value и состава, переименование его не шлют', () => {
			const { owner, collection, items, facadeFor, select } = createSelect(['a', 'b', 'c'], {
				editable: true,
			})
			const choose = vi.fn()

			select.events.on('choose', choose)

			items[2].disabled = true
			facadeFor(2).choose()
			owner.value = 'a'
			items[0].text = 'Другое'
			collection.engine.extensions.batch.remove([items[1]])
			collection.items = [items[0], items[2]]

			expect(owner.value).toBe('a')
			expect(choose).not.toHaveBeenCalled()
		})
	})
})

/**
 * `field` — единственный держатель текста и плейсхолдера поля: экземпляр
 * `TInput`, которым владеет Select. Второй копии значения рядом с этим не
 * заводим (см. AGENTS.md, раздел про Select) — писать в `<input>` напрямую
 * не пришлось.
 */
describe('field — экземпляр TInput, которым владеет Select', () => {
	it('существует и не меняется за время жизни Select', () => {
		const select = new TSelect()

		expect(select.field).toBeInstanceOf(TInput)
		expect(select.field).toBe(select.field)
	})

	it('получает disabled/size/readonly от Select при создании', () => {
		const select = new TSelect({ disabled: true, size: 'lg', editable: true })

		expect(select.field.disabled).toBe(true)
		expect(select.field.size).toBe('lg')
		expect(select.field.readonly).toBe(false)
	})

	it('следует за сменой disabled/size/readonly', () => {
		const select = new TSelect()

		select.disabled = true
		expect(select.field.disabled).toBe(true)

		select.size = 'lg'
		expect(select.field.size).toBe('lg')

		select.editable = true
		expect(select.field.readonly).toBe(false)
	})

	it('value следует за выбором в single', () => {
		const { owner, facadeFor } = createSelect(['a', 'b'])

		expect(owner.field.value).toBe('')

		facadeFor(0).choose()

		expect(owner.field.value).toBe('A')
	})

	it('value в multiple всегда пуст', () => {
		const { owner, collection, facadeFor } = createSelect(['a', 'b'])

		collection.mode = 'multiple'
		facadeFor(0).choose()
		facadeFor(1).choose()

		expect(owner.field.value).toBe('')
	})

	/**
	 * Кнопку очистки рисует поле, а не Select: `clearable` — вход Select,
	 * который уходит полю, как `name` и `size`, а набор кнопки — у поля, и имя
	 * в него пишет плагин имён поля. Второй копии набора у Select нет.
	 */
	describe('кнопка очистки — у поля', () => {
		it('clearable уходит полю при создании и при смене', () => {
			const select = new TSelect({ clearable: true })

			expect(select.field.clearable).toBe(true)

			select.clearable = false

			expect(select.field.clearable).toBe(false)
		})

		it('умолчание — поля', () => {
			expect(new TSelect().clearable).toBe(TInput.defaultValues.clearable)
		})

		it('набор кнопки — у поля; имя поля, из которого плагин имён собирает имя кнопки, — от Select', () => {
			const select = new TSelect({ name: 'Город' })

			expect(select.field.clearAria.has('aria-label')).toBe(false)
			expect(select.field.name).toBe('Город')

			select.name = 'Улица'
			expect(select.field.name).toBe('Улица')
		})

		it('своего имени кнопки и модификатора --clearable у Select нет', () => {
			const select = new TSelect({ clearable: true })

			expect('clearAria' in select).toBe(false)
			expect(select.classes.toArray()).not.toContain('s-select--clearable')
			expect(select.field.classes.toArray()).toContain('s-input--clearable')
		})
	})
})

describe('id элемента формы', () => {
	/**
	 * Живёт в `TInputControl`, а не в Select: на поле ссылаются `<label for>` и
	 * `aria-labelledby` разметки потребителя — это нужно любому форменному
	 * контролу. Значение потребителя: не задан — атрибута нет, сама библиотека
	 * на поле по `id` не ссылается.
	 */
	it('не задан — undefined', () => {
		expect(new TSelect().id).toBeUndefined()
	})

	it('заданный снаружи — как есть, и он же у поля', () => {
		const select = new TSelect({ id: 'city' })

		expect(select.id).toBe('city')
		expect(select.field.id).toBe('city')
	})

	it('меняется через instance, сообщает об этом и доходит до поля', () => {
		const select = new TSelect()
		const seen: (string | undefined)[] = []

		select.events.on('change:id', (value) => seen.push(value))
		select.id = 'city'
		select.id = 'city'

		expect(select.field.id).toBe('city')
		expect(seen).toEqual(['city'])
	})

	it('снятие убирает id', () => {
		const select = new TSelect({ id: 'city' })

		select.id = undefined

		expect(select.id).toBeUndefined()
		expect(select.getProps().id).toBeUndefined()
	})

	it('есть у всех форменных контролов, не только у Select', () => {
		expect(new TInput({ id: 'name' }).id).toBe('name')
		expect(new TInput().id).toBeUndefined()
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

	/**
	 * Плейсхолдер гаснет по наличию тегов, а не по наличию инстанса `TTags`:
	 * инстанс появляется вместе с режимом `multiple` и живёт всё время, поэтому
	 * проверка по нему гасила подсказку у пустого поля.
	 */
	it('плейсхолдер гаснет только когда тег реально появился', () => {
		const { owner, collection, facadeFor } = createSelect(['a', 'b'], {
			placeholder: 'Выберите',
		})

		collection.mode = 'multiple'

		expect(owner.field.placeholder).toBe('Выберите')

		facadeFor(0).choose()

		expect(owner.field.placeholder).toBe('')
	})

	it('выбор опции даёт тег с её текстом', () => {
		const { collection, facadeFor } = createSelect(['a', 'b'])

		collection.mode = 'multiple'
		facadeFor(0).choose()
		facadeFor(1).choose()

		expect([...tagsEngine(collection).extensions.batch.items].map((item) => item.text)).toEqual(
			['A', 'B'],
		)
	})

	/**
	 * Тег показывает текст опции, а не снимок на момент выбора: приложение
	 * переименовывает опции и после выбора — так делает серверный поиск, патчем
	 * с `trackBy`. Тег обновляется на месте, а не пересоздаётся.
	 */
	it('переименовали выбранную опцию — текст её тега сменился на месте', () => {
		const { collection, items, facadeFor } = createSelect(['a', 'b'])

		collection.mode = 'multiple'
		facadeFor(0).choose()
		facadeFor(1).choose()

		const batch = tagsEngine(collection).extensions.batch
		const tag = batch.items[0]

		items[0].text = 'Другое'

		expect(batch.items.map((item) => item.text)).toEqual(['Другое', 'B'])
		expect(batch.items[0]).toBe(tag)
	})

	it('переименование невыбранной опции теги не трогает', () => {
		const { collection, items, facadeFor } = createSelect(['a', 'b'])

		collection.mode = 'multiple'
		facadeFor(0).choose()

		const engine = tagsEngine(collection)
		const changed = vi.fn()

		engine.extensions.plain.events.on('change:items', changed)
		items[1].text = 'Другое'

		expect(engine.extensions.batch.items.map((item) => item.text)).toEqual(['A'])
		expect(changed).not.toHaveBeenCalled()
	})

	it('снятие выбора убирает тег', () => {
		const { collection, facadeFor } = createSelect(['a', 'b'])

		collection.mode = 'multiple'
		facadeFor(0).choose()
		facadeFor(0).choose() // повторный выбор в multiple снимает

		expect([...tagsEngine(collection).extensions.batch.items]).toHaveLength(0)
	})

	it('закрытие тега снимает выбор с опции по value', () => {
		const { collection, items, facadeFor } = createSelect(['a', 'b'])

		collection.mode = 'multiple'
		facadeFor(0).choose()
		facadeFor(1).choose()

		const engine = tagsEngine(collection)
		const tag = [...engine.extensions.batch.items][0]

		engine.extensions.tags.closeTag(tag)

		expect(collection.selected).toEqual([items[1]])
	})

	/**
	 * Закрываемость — то, что видит разметка: `closable` item-адаптера тега.
	 * Своё `closable` тега выключение не переписывает (см. `tags.spec.ts`,
	 * «выключенный тег не закрывается»).
	 */
	it('disabled поля гасит closable тегов', () => {
		const { owner, collection, facadeFor } = createSelect(['a'])

		collection.mode = 'multiple'
		facadeFor(0).choose()
		owner.disabled = true

		const engine = tagsEngine(collection)
		const tag = [...engine.extensions.batch.items][0]
		const registry = new TItemContextRegistry(engine.getCore())

		expect(registry.get(tag).adapters.tags.closable).toBe(false)
		expect(engine.extensions.tags.closeTag(tag)).toBe(false)
	})

	it('field.value пуст, пока теги есть, — текст рисуют они', () => {
		const { owner, collection, facadeFor } = createSelect(['a', 'b'])

		collection.mode = 'multiple'
		facadeFor(0).choose()

		expect(owner.field.value).toBe('')
	})

	/**
	 * Приложение убирает выбранную опцию из списка — так делает серверный
	 * поиск, вернувший выдачу без неё. Способов три, и раньше они давали три
	 * разных исхода: тег то оставался (закрыть его было нечем — опции, с
	 * которой снимать выбор, в списке уже нет), то пропадал, смотря сколько
	 * опций выбрано и появились ли в выдаче новые. Правило одно: тег следует
	 * за выбором, а выбор удалённая опция покидает. `value` её помнит и ждёт
	 * возвращения — как текст выбранного в `single`.
	 */
	describe.each(REMOVE_FIRST_OPTION)('опцию убрали из списка %s', (_name, removeFirst) => {
		it('выбрана была она одна — тега нет, плейсхолдер вернулся, value её помнит', () => {
			const { owner, collection, items, facadeFor } = createSelect(['a', 'b'], {
				placeholder: 'Выберите',
			})

			collection.mode = 'multiple'
			facadeFor(0).choose()

			removeFirst(collection, items)

			expect(tagsEngine(collection).extensions.batch.items).toHaveLength(0)
			expect(owner.field.placeholder).toBe('Выберите')
			expect(owner.value).toEqual(['a'])
		})

		it('выбраны были две — остаётся тег оставшейся', () => {
			const { owner, collection, items, facadeFor } = createSelect(['a', 'b'])

			collection.mode = 'multiple'
			facadeFor(0).choose()
			facadeFor(1).choose()

			removeFirst(collection, items)

			expect(tagsEngine(collection).extensions.batch.items.map((item) => item.text)).toEqual([
				'B',
			])
			expect(owner.value).toEqual(['a', 'b'])
		})

		it('опция вернулась в выдачу — вернулись и выбор, и её тег', () => {
			const { collection, items, facadeFor } = createSelect(['a', 'b'])

			collection.mode = 'multiple'
			facadeFor(0).choose()

			removeFirst(collection, items)
			patchOptions(collection, [
				{ value: 'a', text: 'A' },
				{ value: 'b', text: 'B' },
			])

			expect(tagsEngine(collection).extensions.batch.items.map((item) => item.text)).toEqual([
				'A',
			])
			expect(collection.selected.map((item) => item.value)).toEqual(['a'])
		})
	})
})

describe('editable — ввод текста в поле', () => {
	it('по умолчанию выключен, select-only', () => {
		const select = new TSelect()

		expect(select.editable).toBe(false)
	})

	it('меняется через instance и сообщает об этом', () => {
		const select = new TSelect()
		const handler = vi.fn()

		select.events.on('change:editable', handler)
		select.editable = true

		expect(select.editable).toBe(true)
		expect(handler).toHaveBeenCalledWith(true)
	})

	it('повтор того же значения события не даёт', () => {
		const select = new TSelect({ editable: true })
		const handler = vi.fn()

		select.events.on('change:editable', handler)
		select.editable = true

		expect(handler).not.toHaveBeenCalled()
	})

	it('ставит aria-autocomplete="list" — режим на атрибут не влияет', () => {
		const select = new TSelect({ editable: true, editableMode: 'none' })

		expect(select.field.aria.get('aria-autocomplete')).toBe('list')

		select.editable = false

		expect(select.field.aria.has('aria-autocomplete')).toBe(false)
	})

	describe('readonly — им управляет editable', () => {
		it('select-only: editable=false → readonly=true', () => {
			const select = new TSelect()

			expect(select.readonly).toBe(true)
		})

		it('editable=true → readonly=false', () => {
			const select = new TSelect({ editable: true })

			expect(select.readonly).toBe(false)
		})

		it('в конструкторе editable сильнее пропа readonly', () => {
			const select = new TSelect({ readonly: true, editable: true })

			expect(select.readonly).toBe(false)
		})

		it('readonly=true, editable=false — readonly и так true', () => {
			const select = new TSelect({ readonly: true })

			expect(select.readonly).toBe(true)
		})

		it('в рантайме editable переставляет readonly', () => {
			const select = new TSelect({ editable: true })

			expect(select.readonly).toBe(false)

			select.editable = false

			expect(select.readonly).toBe(true)

			select.editable = true

			expect(select.readonly).toBe(false)
		})

		it('своей логики у readonly нет — присваивание работает как обычно', () => {
			const select = new TSelect({ editable: true })

			select.readonly = true

			expect(select.readonly).toBe(true)
			// editable не пересчитывается: он причина, а не следствие
			expect(select.editable).toBe(true)
		})

		it('смена editable сообщает и о readonly', () => {
			const select = new TSelect()
			const handler = vi.fn()

			select.events.on('change:readonly', handler)
			select.editable = true

			expect(handler).toHaveBeenCalledWith(false)
		})
	})

	it('openable не зависит ни от editable, ни от readonly — только от disabled', () => {
		const editable = new TSelect({ editable: true })
		const selectOnly = new TSelect({ editable: false })

		// select-only и есть readonly=true, а панель ему нужна
		expect(selectOnly.readonly).toBe(true)
		expect(selectOnly.openable).toBe(true)
		expect(editable.openable).toBe(true)

		editable.readonly = true

		expect(editable.openable).toBe(true)

		editable.disabled = true

		expect(editable.openable).toBe(false)
	})

	describe('toggleOpen — простой тумблер, режим ядру не важен', () => {
		it('открывает закрытую панель', () => {
			const select = new TSelect({ editable: true })

			select.toggleOpen()

			expect(select.open).toBe(true)
		})

		it('закрывает открытую панель — так же, как в select-only', () => {
			const select = new TSelect({ editable: true, open: true })

			select.toggleOpen()

			expect(select.open).toBe(false)
		})

		it('в select-only toggleOpen работает так же', () => {
			const select = new TSelect({ open: true })

			select.toggleOpen()

			expect(select.open).toBe(false)
		})

		it('закрытие в editable остаётся доступно напрямую — Escape, выбор, клик мимо', () => {
			const select = new TSelect({ editable: true, open: true })

			select.open = false

			expect(select.open).toBe(false)
		})
	})

	it('getProps отдаёт editable', () => {
		const select = new TSelect({ editable: true })

		expect(select.getProps().editable).toBe(true)
	})
})

describe('editableMode — что делает ввод текста', () => {
	it('по умолчанию search', () => {
		const select = new TSelect()

		expect(select.editableMode).toBe('search')
	})

	it('меняется через instance и сообщает об этом ровно раз', () => {
		const select = new TSelect({ editable: true, editableMode: 'none' })
		const handler = vi.fn()

		select.events.on('change:editableMode', handler)
		select.editableMode = 'search'
		select.editableMode = 'search'

		expect(select.editableMode).toBe('search')
		expect(handler).toHaveBeenCalledTimes(1)
		expect(handler).toHaveBeenCalledWith('search')
	})

	it('getProps отдаёт editableMode', () => {
		const select = new TSelect({ editable: true, editableMode: 'filter' })

		expect(select.getProps().editableMode).toBe('filter')
	})

	describe('aria-autocomplete — по editable, режим не влияет', () => {
		it('editable: false — атрибута нет, независимо от режима', () => {
			const select = new TSelect({ editable: false, editableMode: 'search' })

			expect(select.field.aria.has('aria-autocomplete')).toBe(false)
		})

		it('editable: true, editableMode: none — "list"', () => {
			const select = new TSelect({ editable: true, editableMode: 'none' })

			expect(select.field.aria.get('aria-autocomplete')).toBe('list')
		})

		it('editable: true, editableMode: search — "list"', () => {
			const select = new TSelect({ editable: true, editableMode: 'search' })

			expect(select.field.aria.get('aria-autocomplete')).toBe('list')
		})

		it('editable: true, editableMode: filter — "list"', () => {
			const select = new TSelect({ editable: true, editableMode: 'filter' })

			expect(select.field.aria.get('aria-autocomplete')).toBe('list')
		})

		it('смена editableMode в рантайме не меняет атрибут — он всегда "list"', () => {
			const select = new TSelect({ editable: true, editableMode: 'none' })

			expect(select.field.aria.get('aria-autocomplete')).toBe('list')

			select.editableMode = 'search'

			expect(select.field.aria.get('aria-autocomplete')).toBe('list')
		})

		it('смена editable в рантайме тоже пересчитывает атрибут — режим уже search', () => {
			const select = new TSelect({ editableMode: 'search' })

			expect(select.field.aria.has('aria-autocomplete')).toBe(false)

			select.editable = true

			expect(select.field.aria.get('aria-autocomplete')).toBe('list')
		})
	})
})

/**
 * `placement` — с какой стороны поля открывается панель. Сторону считает
 * плагин якоря вложенного Frame; ядро только переводит выбор потребителя в его
 * пропы: `panelPlacement` → `anchor_placement`, `panelFlip` → `anchor_flip`.
 */
describe('placement — сторона панели', () => {
	it('по умолчанию auto', () => {
		expect(new TSelect().placement).toBe('auto')
	})

	const cases: Array<[TSelectPlacement, TSelectPanelPlacement, boolean]> = [
		['auto', 'bottom-start', true],
		['bottom', 'bottom-start', false],
		['top', 'top-start', false],
	]

	it.each(cases)('%s: панель %s, flip %s', (placement, panelPlacement, panelFlip) => {
		const select = new TSelect({ placement })

		expect(select.panelPlacement).toBe(panelPlacement)
		expect(select.panelFlip).toBe(panelFlip)
	})

	it('смена на лету пересчитывает сторону и flip и сообщает об этом ровно раз', () => {
		const select = new TSelect()
		const handler = vi.fn()

		select.events.on('change:placement', handler)
		select.placement = 'top'
		select.placement = 'top'

		expect(select.panelPlacement).toBe('top-start')
		expect(select.panelFlip).toBe(false)
		expect(handler).toHaveBeenCalledTimes(1)
		expect(handler).toHaveBeenCalledWith('top')
	})

	it('getProps отдаёт placement', () => {
		expect(new TSelect({ placement: 'bottom' }).getProps().placement).toBe('bottom')
	})
})

/**
 * Смена режима выбора на лету. Сбрасывает выбор сам движок
 * (`TSelectionExtension.mode`); здесь проверяется, что Select это доносит до
 * `value`, поля и aria.
 */
describe('смена mode на лету', () => {
	it('multiple -> single при двух выбранных сбрасывает выбор целиком', () => {
		const { owner, collection, items, facadeFor } = createSelect(['a', 'b'])

		collection.mode = 'multiple'
		facadeFor(0).choose()
		facadeFor(1).choose()

		collection.mode = 'single'

		expect(collection.selected).toEqual([])
		expect(owner.value).toBeUndefined()
		expect(owner.field.value).toBe('')
		items.forEach((item) => expect(item.aria.get('aria-selected')).toBe('false'))
	})

	it('multiple -> single при одном выбранном тоже сбрасывает', () => {
		const { owner, collection, facadeFor } = createSelect(['a', 'b'])

		collection.mode = 'multiple'
		facadeFor(0).choose()

		collection.mode = 'single'

		expect(collection.selected).toEqual([])
		expect(owner.value).toBeUndefined()
	})

	it('single -> multiple выбор оставляет', () => {
		const { collection, facadeFor } = createSelect(['a', 'b'])

		facadeFor(0).choose()

		collection.mode = 'multiple'

		expect(collection.selected).toHaveLength(1)
		expect(collection.selected[0].value).toBe('a')
	})

	/**
	 * `single -> multiple` выбор не трогает, и `change:selection` не приходит —
	 * поле пересчитывает сама смена режима. Раньше в нём оставался текст
	 * выбранного рядом с его тегом, пока не сменится выбор.
	 */
	it('single -> multiple с выбором — поле пусто, выбранное показывает тег', () => {
		const { owner, collection, facadeFor } = createSelect(['a', 'b'])

		facadeFor(0).choose()

		collection.mode = 'multiple'

		expect(owner.field.value).toBe('')
		expect(tagsEngine(collection).extensions.batch.items.map((item) => item.text)).toEqual([
			'A',
		])
	})

	/** Смена режима — не выбор пользователя: поле пишется мягко. */
	it('single -> multiple с набранным текстом — набранное на месте', () => {
		const { owner, collection, facadeFor } = createSelect(['a', 'b'], { editable: true })

		facadeFor(0).choose()
		owner.field.value = 'typed'

		collection.mode = 'multiple'

		expect(owner.field.value).toBe('typed')
	})

	/**
	 * Оставшийся в поле текст выбранного мягкая запись принимала за набранный:
	 * закрытие тега его не стирало, он уходил только с выбором опции, очисткой
	 * или возвратом поля.
	 */
	it('после single -> multiple закрытие тега не оставляет в поле текст выбранного', () => {
		const { owner, collection, facadeFor } = createSelect(['a', 'b'])

		facadeFor(0).choose()
		collection.mode = 'multiple'

		const engine = tagsEngine(collection)

		engine.extensions.tags.closeTag(engine.extensions.batch.items[0])

		expect(collection.selected).toEqual([])
		expect(owner.field.value).toBe('')
	})
})

describe('removeOnBackspace — удаление тегов по Backspace', () => {
	it('по умолчанию выключено', () => {
		const select = new TSelect()

		expect(select.removeOnBackspace).toBe(false)
	})

	it('меняется через instance и сообщает об этом ровно раз', () => {
		const select = new TSelect()
		const handler = vi.fn()

		select.events.on('change:removeOnBackspace', handler)
		select.removeOnBackspace = true
		select.removeOnBackspace = true

		expect(select.removeOnBackspace).toBe(true)
		expect(handler).toHaveBeenCalledTimes(1)
		expect(handler).toHaveBeenCalledWith(true)
	})

	it('getProps отдаёт removeOnBackspace', () => {
		const select = new TSelect({ removeOnBackspace: true })

		expect(select.getProps().removeOnBackspace).toBe(true)
	})
})

/**
 * Жест — смахнуть панель, чтобы закрыть. Тянет плагин жеста (общий с
 * поповером и выезжающей панелью), ядро держит значения: за что тянуть, куда
 * панель уходит и признак «тянут». Панель у поля, и сторону после flip знает
 * только её узел.
 */
describe('жест — смахнуть панель, чтобы закрыть', () => {
	/** Открытый Select: закрытую панель не тянут. */
	const shown = (props: Partial<ISelectProps> = {}) => new TSelect({ open: true, ...props })

	it('по умолчанию выключен: полосы нет, сторону решает якорь', () => {
		const select = new TSelect()

		expect(select.swipe).toBe('none')
		expect(select.handleRendered).toBe(false)
		expect(select.swipeSide).toBeNull()
		expect(select.swiping).toBe(false)
	})

	it('смахиваемый слой: контракт жеста узнаётся тип-гардом', () => {
		expect(isSwipeable(new TSelect())).toBe(true)
	})

	it('swipe шлёт change:swipe только на реальное изменение, getProps его отдаёт', () => {
		const select = new TSelect()
		const handler = vi.fn()

		select.events.on('change:swipe', handler)
		select.swipe = 'panel'
		select.swipe = 'panel'

		expect(handler.mock.calls).toEqual([['panel']])
		expect(new TSelect({ swipe: 'handle' }).getProps().swipe).toBe('handle')
	})

	it('полосу рисуют, пока жест включён', () => {
		const select = new TSelect({ swipe: 'handle' })

		expect(select.handleRendered).toBe(true)

		select.swipe = 'panel'

		expect(select.handleRendered).toBe(true)

		select.swipe = 'none'

		expect(select.handleRendered).toBe(false)
	})

	it('beginSwipe: data-swiping панели и change:swiping, endSwipe — назад', () => {
		const select = shown({ swipe: 'handle' })
		const changes: boolean[] = []

		select.events.on('change:swiping', (value) => changes.push(value))

		expect(select.panelDataset).toEqual({ 'data-swiping': 'false' })
		expect(select.beginSwipe()).toBe(true)
		expect(select.swiping).toBe(true)
		expect(select.panelDataset).toEqual({ 'data-swiping': 'true' })

		select.endSwipe()

		expect(select.swiping).toBe(false)
		expect(changes).toEqual([true, false])
	})

	// Панель телепортирована, и `dataset` корня до неё не доходит. Открытость
	// панели пишет её слой, сторону — плагин якоря: в наборе их нет
	it('признак «тянут» — у панели, а не у корня; data-open в наборе панели нет', () => {
		const select = shown({ swipe: 'handle' })

		select.beginSwipe()

		expect(select.dataset.has('swiping')).toBe(false)
		expect(select.panelDataset).not.toHaveProperty('data-open')
		expect(select.panelDataset).not.toBe(select.panelDataset)
	})

	it('без жеста и у закрытой панели жест не начинается', () => {
		expect(shown().beginSwipe()).toBe(false)
		expect(new TSelect({ swipe: 'panel' }).beginSwipe()).toBe(false)
	})

	it('закрытие — и выключением — и выключенный жест кончают начатый жест', () => {
		const closed = shown({ swipe: 'panel' })

		closed.beginSwipe()
		closed.open = false

		expect(closed.swiping).toBe(false)

		const disabled = shown({ swipe: 'panel' })

		disabled.beginSwipe()
		disabled.disabled = true

		expect(disabled.open).toBe(false)
		expect(disabled.swiping).toBe(false)

		const switched = shown({ swipe: 'panel' })

		switched.beginSwipe()
		switched.swipe = 'none'

		expect(switched.swiping).toBe(false)
		expect(switched.panelDataset['data-swiping']).toBe('false')
	})
})
