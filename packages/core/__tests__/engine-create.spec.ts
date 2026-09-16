/**
 * Коллекция, собранная снаружи компонента.
 *
 * Движок можно построить заранее и передать компоненту — как готовый инстанс
 * передают в `ctrl`. Проп `engine` для этого однажды уже заводили и убрали:
 * часть расширений требует владельца, а его снаружи нет. Ответ — уровни:
 * пользователь собирает то, что собирается без компонента, остальное компонент
 * добавляет сам при привязке.
 *
 * Главная опасность схемы не в наборах, а в **опоздании**. Расширения
 * подписываются на будущее (`item:added`, `item:add:before`, `meta:applied`) и
 * молча пропускают то, что уже лежит в коллекции. Поэтому каждое обязано при
 * установке догнать накопленное — и здесь это проверяется по одному случаю на
 * расширение. Снимите строку догона в любом `install` — красным станет ровно
 * соответствующий тест.
 */

import { describe, it, expect, vi, afterEach } from 'vitest'
import {
	createEngine,
	createEngineActivation,
	createEngineSelection,
	createEngineTabs,
	createEngineListBox,
	createEngineSelect,
	createEngineAccordion,
	TTabs,
	TTabsItem,
	TTabsCollectionFacade,
	TListBox,
	TListBoxCollectionFacade,
	TSelect,
	TAccordion,
} from '../src'

afterEach(() => {
	vi.restoreAllMocks()
})

describe('уровни сборки', () => {
	it('базовый даёт состав, но не поведение', () => {
		const engine = createEngine({ items: [{ value: 'a' }] })

		expect(engine.extensions.batch).toBeDefined()
		expect(engine.extensions.meta).toBeDefined()
		expect('activation' in engine.extensions).toBe(false)
		expect('selection' in engine.extensions).toBe(false)
		expect(engine.extensions.batch.items.length).toBe(1)
	})

	it('поведенческий добавляет активацию или выбор', () => {
		expect(createEngineActivation().extensions.activation).toBeDefined()
		expect(createEngineSelection().extensions.selection).toBeDefined()
	})

	/** Состав необязателен: его можно задать и потом, через сам движок. */
	it('без items коллекция пуста, но рабочая', () => {
		const engine = createEngine<{ value: string }>()

		engine.extensions.batch.set([{ value: 'a' }, { value: 'b' }])

		expect(engine.extensions.batch.items.length).toBe(2)
	})
})

/**
 * Компонентный уровень — у всех четырёх, а не только у Tabs. Список задан
 * данными: забытый пятый компонент иначе прошёл бы мимо проверки.
 *
 * Функции строят разные уровни движка (разный owner, разное дополнительное
 * расширение), поэтому объединять их в одну сигнатуру пришлось бы через
 * `any`. Вместо этого каждый кейс — замыкание, типизированное на своей
 * функции: TypeScript проверяет каждое тело отдельно, без стирания типов.
 */
type EngineTestCase = {
	name: string
	run: () => { batch: unknown; ownerExtension: unknown }
	runWithoutOwner: () => void
}

const engineCases: EngineTestCase[] = [
	{
		name: 'createEngineTabs',
		run: () => {
			const engine = createEngineTabs({ owner: new TTabs() })
			return { batch: engine.extensions.batch, ownerExtension: engine.extensions.tabs }
		},
		runWithoutOwner: () => {
			expect(() => {
				// @ts-expect-error — owner обязателен, здесь проверяется рантайм-ошибка без него
				createEngineTabs({})
			}).toThrow(/owner/)
		},
	},
	{
		name: 'createEngineListBox',
		run: () => {
			const engine = createEngineListBox({ owner: new TListBox() })
			return { batch: engine.extensions.batch, ownerExtension: engine.extensions.list }
		},
		runWithoutOwner: () => {
			expect(() => {
				// @ts-expect-error — owner обязателен, здесь проверяется рантайм-ошибка без него
				createEngineListBox({})
			}).toThrow(/owner/)
		},
	},
	{
		name: 'createEngineSelect',
		run: () => {
			const engine = createEngineSelect({ owner: new TSelect() })
			return { batch: engine.extensions.batch, ownerExtension: engine.extensions.select }
		},
		runWithoutOwner: () => {
			expect(() => {
				// @ts-expect-error — owner обязателен, здесь проверяется рантайм-ошибка без него
				createEngineSelect({})
			}).toThrow(/owner/)
		},
	},
	{
		name: 'createEngineAccordion',
		run: () => {
			const engine = createEngineAccordion({ owner: new TAccordion() })
			return { batch: engine.extensions.batch, ownerExtension: engine.extensions.accordion }
		},
		runWithoutOwner: () => {
			expect(() => {
				// @ts-expect-error — owner обязателен, здесь проверяется рантайм-ошибка без него
				createEngineAccordion({})
			}).toThrow(/owner/)
		},
	},
]

engineCases.forEach(({ name, run, runWithoutOwner }) => {
	describe(name, () => {
		it('отдаёт полный набор своего компонента', () => {
			const { batch, ownerExtension } = run()

			expect(batch).toBeDefined()
			expect(ownerExtension).toBeDefined()
		})

		it('без owner — внятная ошибка, а не undefined внутри расширения', () => {
			runWithoutOwner()
		})
	})
})

describe('догон накопленного при привязке', () => {
	/**
	 * `factory` оборачивает сырой источник в класс элемента по `item:add:before`.
	 * На первом уровне класс неизвестен, поэтому в коллекции лежат обычные
	 * объекты — и стать элементами они обязаны при привязке.
	 */
	it('сырые объекты становятся элементами', () => {
		const engine = createEngine({ items: [{ value: 'a', text: 'A' }] })

		expect(engine.extensions.batch.items[0]).not.toBeInstanceOf(TTabsItem)

		const owner = new TTabs()

		new TTabsCollectionFacade({}, { owner, engine })

		const item = engine.extensions.batch.items[0]

		expect(item).toBeInstanceOf(TTabsItem)
		if (item instanceof TTabsItem) {
			expect(item.text).toBe('A')
		}
	})

	/**
	 * `meta` читает `_` в момент добавления и эмитит `meta:applied`. Событие
	 * живёт мгновение: `activation` подключается позже и без памяти о снимке
	 * флаг бы потерялся.
	 */
	it('_.active из items уровня 1 доезжает до активации', () => {
		const engine = createEngine({
			items: [
				{ value: 'a', text: 'A' },
				{ value: 'b', text: 'B', _: { active: true } },
			],
		})

		const owner = new TTabs()
		const facade = new TTabsCollectionFacade({}, { owner, engine })

		expect(facade.activeItem?.value).toBe('b')
	})

	/** Владельческие раздают свойства владельца тоже по `item:added`. */
	it('элементы, добавленные до привязки, получают size и variant владельца', () => {
		const engine = createEngine({ items: [{ value: 'a', text: 'A' }] })
		const owner = new TTabs({ size: 'lg', variant: 'accent' })

		new TTabsCollectionFacade({}, { owner, engine })

		const item = engine.extensions.batch.items[0]

		expect(item).toBeInstanceOf(TTabsItem)
		if (item instanceof TTabsItem) {
			expect(item.size).toBe('lg')
			expect(item.variant).toBe('accent')
		}
	})

	it('_.selected доезжает до выбора у списочных', () => {
		const engine = createEngine({
			items: [{ value: 'a', text: 'A', _: { selected: true } }],
		})

		const owner = new TListBox()
		const facade = new TListBoxCollectionFacade({}, { owner, engine })

		expect(facade.selected.map((item) => item.value)).toEqual(['a'])
	})
})

describe('дополнение недостающего', () => {
	it('движок уровня 1 получает всё, что нужно Tabs', () => {
		const engine = createEngine({ items: [{ value: 'a' }] })

		new TTabsCollectionFacade({}, { owner: new TTabs(), engine })

		// Facade доустановила эти четыре расширения поверх уровня 1 — движок
		// вырос за пределы статического типа `createEngine()`, поэтому имя
		// читаем через приведение к обобщённой карте, а не к `any`.
		const extensions = engine.extensions as Record<string, unknown>

		for (const name of ['factory', 'activation', 'content', 'tabs']) {
			expect(extensions[name], name).toBeDefined()
		}
	})

	/**
	 * Один движок в двух компонентах — расширения лежат по имени, и второй
	 * молча затёр бы владельческое расширение первого. Не падаем и не
	 * поддерживаем двух владельцев: предупреждаем.
	 */
	it('второй компонент на том же движке предупреждает', () => {
		const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
		const engine = createEngine({ items: [{ value: 'a' }] })

		new TTabsCollectionFacade({}, { owner: new TTabs(), engine })
		expect(warn).not.toHaveBeenCalled()

		new TTabsCollectionFacade({}, { owner: new TTabs(), engine })
		expect(warn).toHaveBeenCalledOnce()
	})
})
