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
	createEngineListBox,
} from '../src'
import type {
	IListBoxItem,
	IListBoxProps,
	TListContentFit,
	TListItemContentFit,
} from '@soldy-ui/core'

function createListBox(texts: string[], props: Partial<IListBoxProps> = {}) {
	const owner = new TListBox(props)
	const facade = new TListBoxCollectionFacade({}, { owner })
	const items = texts.map((text) => new TListBoxItem({ value: text, text }))

	facade.items = items as IListBoxItem[]

	const registry = new TItemContextRegistry(facade.engine.getCore())

	/** Фасад элемента — через него разметка читает членство в коллекции. */
	const facadeFor = (index: number) => {
		const facade = new TListBoxItemCollectionFacade()

		facade.setContext(registry.get(items[index]))

		return facade
	}

	return { owner, facade, items, facadeFor, registry }
}

describe('view пробрасывается со списка на элемент', () => {
	it('элемент берёт вид владельца', () => {
		expect(createListBox(['a'], { view: 'solid' }).facadeFor(0).view).toBe('solid')
	})

	/**
	 * Запасного значения у фасада нет: вид строки по умолчанию рисует тема, и
	 * имени для него у библиотеки нет. Раньше фасад подставлял `'plain'`.
	 */
	it('у списка без вида нет вида и у элемента', () => {
		expect(createListBox(['a']).facadeFor(0).view).toBeUndefined()
	})

	/**
	 * Тот самый релей. Без него элемент узнавал бы о смене вида только при
	 * пересоздании — то есть в живом интерфейсе не узнавал бы вовсе.
	 */
	it('смена вида у списка доходит до элемента событием', () => {
		const { owner, facadeFor } = createListBox(['a', 'b'], { view: 'ghost' })
		const facade = facadeFor(0)
		const seen: unknown[] = []

		facade.events.on('change:view', (value: unknown) => seen.push(value))

		owner.view = 'solid'

		expect(seen).toEqual(['solid'])
		expect(facade.view).toBe('solid')
	})

	it('вид доходит до всех элементов, а не только до первого', () => {
		const { owner, facadeFor } = createListBox(['a', 'b', 'c'], { view: 'ghost' })
		const facades = [facadeFor(0), facadeFor(1), facadeFor(2)]

		owner.view = 'solid'

		expect(facades.map((facade) => facade.view)).toEqual(['solid', 'solid', 'solid'])
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
		const { owner, facade, items } = createListBox(['a', 'b', 'c'])

		owner.value = 'b'

		expect(facade.selected).toEqual([items[1]])
	})

	it('выбор элемента пишет значение', () => {
		const { owner, facade, items } = createListBox(['a', 'b', 'c'])

		facade.engine.extensions.selection.select(items[2])

		expect(owner.value).toBe('c')
	})

	it('в multiple значение — массив', () => {
		const { owner, facade, items } = createListBox(['a', 'b', 'c'])

		facade.mode = 'multiple'
		facade.engine.extensions.selection.select(items[0])
		facade.engine.extensions.selection.select(items[2])

		expect(owner.value).toEqual(['a', 'c'])
	})

	it('снятие выбора обнуляет значение', () => {
		const { owner, facade } = createListBox(['a', 'b'])

		owner.value = 'a'
		facade.engine.extensions.selection.resetSelection()

		expect(owner.value).toBeUndefined()
	})

	/**
	 * Значение приходит пропом сразу, а элементы регистрируются при
	 * монтировании — то есть позже. Без повторного прохода на `item:added`
	 * заданное значение молча терялось бы.
	 */
	it('значение, заданное до появления элементов, применяется при их добавлении', () => {
		const owner = new TListBox({ value: 'b' })
		const facade = new TListBoxCollectionFacade({}, { owner })

		expect(owner.value).toBe('b')

		facade.items = [
			new TListBoxItem({ value: 'a', text: 'a' }),
			new TListBoxItem({ value: 'b', text: 'b' }),
		] as IListBoxItem[]

		expect(facade.selected.map((item) => item.value)).toEqual(['b'])
	})

	/** Синхронизация в обе стороны — самое место для бесконечного цикла. */
	it('не зацикливается', () => {
		const { owner, facade, items } = createListBox(['a', 'b'])
		let changes = 0

		owner.events.on('change:value', () => changes++)
		facade.engine.extensions.selection.select(items[1])

		expect(owner.value).toBe('b')
		expect(changes).toBeLessThan(5)
	})
})

/**
 * Выбор пользователя — `chooseItem` расширения `list`. Через него идут и клик
 * по строке (`choose` item-адаптера), и Enter с пробелом клавиатуры списка.
 *
 * Выключенному элементу он отказывает — выключен ли элемент сам или весь
 * список: `item.disabled` — итог обоих. `TSelectionExtension` выключенность
 * не проверяет, и раньше строка, звавшая `selection.toggle()` напрямую,
 * выбирала выключенный элемент кликом.
 */
describe('выбор пользователя: выключенный элемент не выбирается', () => {
	it('переключает выбор доступного элемента', () => {
		const { facade, items } = createListBox(['a', 'b'])
		const list = facade.engine.extensions.list

		facade.mode = 'multiple'

		expect(list.chooseItem(items[1])).toBe(true)
		expect(facade.selected).toEqual([items[1]])

		expect(list.chooseItem(items[1])).toBe(true)
		expect(facade.selected).toEqual([])
	})

	/** Как выключить элемент и как включить обратно. */
	const WAYS: ReadonlyArray<
		readonly [string, (owner: TListBox, item: IListBoxItem, off: boolean) => void]
	> = [
		[
			'выключен сам',
			(_owner, item, off) => {
				item.disabled = off
			},
		],
		[
			'выключен список',
			(owner, _item, off) => {
				owner.disabled = off
			},
		],
	]

	describe.each(WAYS)('%s', (_way, switchOff) => {
		it('chooseItem отказывает, после включения — выбирает', () => {
			const { owner, facade, items } = createListBox(['a', 'b'])
			const list = facade.engine.extensions.list

			switchOff(owner, items[1], true)

			expect(list.chooseItem(items[1])).toBe(false)
			expect(facade.selected).toEqual([])

			switchOff(owner, items[1], false)

			expect(list.chooseItem(items[1])).toBe(true)
			expect(facade.selected).toEqual([items[1]])
		})

		it('choose item-адаптера идёт тем же путём', () => {
			const { owner, facade, items, registry } = createListBox(['a', 'b'])
			const adapter = registry.get(items[1]).adapters.list

			switchOff(owner, items[1], true)
			adapter.choose()

			expect(facade.selected).toEqual([])

			switchOff(owner, items[1], false)
			adapter.choose()

			expect(facade.selected).toEqual([items[1]])
		})
	})

	/**
	 * О принятом выборе список сообщает событием `choose` — и о повторном
	 * выборе выбранного, который в `single` выбор снимает: по
	 * `change:selection` его не отличить ни от снятия, ни от записи `value`.
	 */
	it('choose — на каждый принятый выбор, после переключения; на отказ и на код — нет', () => {
		const { owner, facade, items } = createListBox(['a', 'b'])
		const list = facade.engine.extensions.list
		const chosen: string[] = []

		list.events.on('choose', (item) => chosen.push(`${item.value}:${String(owner.value)}`))

		list.chooseItem(items[1])
		list.chooseItem(items[1])

		expect(chosen).toEqual(['b:b', 'b:undefined'])

		items[0].disabled = true
		list.chooseItem(items[0])
		owner.value = 'b'
		facade.engine.extensions.selection.toggle(items[1])

		expect(chosen).toHaveLength(2)
	})

	/** Отказ — только выбору пользователя: из кода выбрать выключенный вправе приложение. */
	it('selection.select выключенный элемент выбирает', () => {
		const { facade, items } = createListBox(['a', 'b'])

		items[1].disabled = true
		facade.engine.extensions.selection.select(items[1])

		expect(facade.selected).toEqual([items[1]])
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
		const { owner, facade, items } = createListBox(['a'], { indicator: 'start' })

		owner.indicator = 'end'

		const late = new TListBoxItem({ value: 'z', text: 'z' })

		facade.items = [...items, late] as IListBoxItem[]

		expect(late.dataset.get('indicator')).toBe('end')
	})
})

/**
 * `contentFit` элемента — своё значение поверх списочного.
 *
 * В отличие от `indicator`, своё значение у элемента есть, и оно трёхзначно:
 * `undefined` значит «как у списка». Разрешённое значение уходит в
 * `data-content-fit`, и пишет его родительское расширение — по той же причине,
 * что `data-indicator`. Источников у атрибута два, поэтому пересчитывается он
 * на смену любого из них: и списка, и самого элемента.
 */
describe('data-content-fit элемента: своё значение поверх списочного', () => {
	/** Список и элементы; `undefined` в `own` — элемент без своего значения. */
	const createFitted = (
		own: (TListItemContentFit | undefined)[],
		contentFit: TListContentFit = 'truncate',
	) => {
		const owner = new TListBox({ contentFit })
		const facade = new TListBoxCollectionFacade({}, { owner })
		const items = own.map(
			(fit, index) => new TListBoxItem({ value: String(index), contentFit: fit }),
		)

		facade.items = items as IListBoxItem[]

		return { owner, facade, items }
	}

	const fits = (items: IListBoxItem[]) => items.map((item) => item.dataset.get('content-fit'))

	it('при добавлении своё значение берёт верх над списочным', () => {
		const { items } = createFitted(['wrap', undefined])

		expect(fits(items)).toEqual(['wrap', 'truncate'])
	})

	it('смена у списка не перекрывает своё значение элемента', () => {
		const { owner, items } = createFitted(['truncate', undefined])

		owner.contentFit = 'wrap'

		expect(fits(items)).toEqual(['truncate', 'wrap'])
	})

	/**
	 * Своё значение меняется и после добавления: во Vue это динамический проп
	 * `content-fit` у `ListBox.Item`. Пересчёт только на добавлении и на смене у
	 * списка оставлял атрибут прежним.
	 */
	it('смена своего значения после добавления переставляет атрибут', () => {
		const { items } = createFitted([undefined, undefined])

		items[0].contentFit = 'wrap'

		expect(fits(items)).toEqual(['wrap', 'truncate'])
	})

	it('undefined у элемента возвращает списочное значение', () => {
		const { items } = createFitted(['truncate'], 'wrap')

		items[0].contentFit = undefined

		expect(fits(items)).toEqual(['wrap'])
	})

	/**
	 * Состав без `trackBy` пересобирается через очистку: элементы уходят и
	 * возвращаются теми же инстансами. Вернувшийся элемент слушается снова.
	 */
	it('элемент, вернувшийся в список, слушается снова', () => {
		const { facade, items } = createFitted([undefined, undefined])

		facade.items = [...items] as IListBoxItem[]
		items[1].contentFit = 'wrap'

		expect(fits(items)).toEqual(['truncate', 'wrap'])
	})

	/**
	 * Элемент, ушедший из списка, атрибут от него больше не получает, а
	 * подписка не удерживает список, пока жив элемент.
	 */
	it('удалённый элемент список больше не слушает', () => {
		const { facade, items } = createFitted([undefined, undefined])

		facade.engine.extensions.batch.remove([items[0]])
		items[0].contentFit = 'wrap'

		expect(items[0].dataset.get('content-fit')).toBe('truncate')
	})

	it('после очистки списка элементы тоже не слушаются', () => {
		const { facade, items } = createFitted([undefined, undefined])

		facade.engine.extensions.batch.clear()
		items.forEach((item) => {
			item.contentFit = 'wrap'
		})

		expect(fits(items)).toEqual(['truncate', 'truncate'])
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
		const { facade, items } = createListBox(['a'])
		const late = new TListBoxItem({ value: 'z', text: 'z' })

		facade.items = [...items, late] as IListBoxItem[]

		expect(late.aria.get('tabindex')).toBe('-1')
	})
})

/**
 * `aria-selected` — на всех элементах, а не только на выбранных: скринридер
 * объявляет «не выбрана», и без атрибута этого не скажет. Пишет родительское
 * расширение в набор `aria` элемента, как у Select и Tags: раньше атрибут
 * считала разметка Vue, и в серверную разметку и в остальные адаптеры он бы
 * не попал.
 */
describe('aria-selected у элементов', () => {
	const ariaSelected = (items: readonly IListBoxItem[]) =>
		items.map((item) => item.aria.get('aria-selected'))

	it('стоит у всех элементов, у невыбранных — false', () => {
		const { items } = createListBox(['a', 'b', 'c'])

		expect(ariaSelected(items)).toEqual(['false', 'false', 'false'])
	})

	it('следует за выбором и его снятием', () => {
		const { facade, items } = createListBox(['a', 'b', 'c'])
		const { selection } = facade.engine.extensions

		selection.select(items[1])

		expect(ariaSelected(items)).toEqual(['false', 'true', 'false'])

		// В single новый выбор снимает прежний — атрибут переезжает вместе с ним
		selection.select(items[2])

		expect(ariaSelected(items)).toEqual(['false', 'false', 'true'])

		selection.resetSelection()

		expect(ariaSelected(items)).toEqual(['false', 'false', 'false'])
	})

	it('в multiple стоит у каждого выбранного', () => {
		const { facade, items } = createListBox(['a', 'b', 'c'])

		facade.mode = 'multiple'
		facade.engine.extensions.selection.select(items[0])
		facade.engine.extensions.selection.select(items[2])

		expect(ariaSelected(items)).toEqual(['true', 'false', 'true'])
	})

	it('значение списка, заданное до элементов, выбирает их с атрибутом', () => {
		const owner = new TListBox({ value: 'b' })
		const facade = new TListBoxCollectionFacade({}, { owner })
		const items = [
			new TListBoxItem({ value: 'a', text: 'a' }),
			new TListBoxItem({ value: 'b', text: 'b' }),
		]

		facade.items = items as IListBoxItem[]

		expect(ariaSelected(items)).toEqual(['false', 'true'])
	})

	it('элемент, добавленный позже, получает атрибут по текущему выбору', () => {
		const { owner, facade, items } = createListBox(['a'])
		const late = new TListBoxItem({ value: 'z', text: 'z' })

		owner.value = 'z'
		facade.items = [...items, late] as IListBoxItem[]

		expect(ariaSelected([...items, late])).toEqual(['false', 'true'])
	})
})

/**
 * Роли — природа компонента, и пишет их ядро в свои наборы: список — `listbox`,
 * элемент — `option`, как `TSelectItem` и `TTabsItem`. От коллекции и режима
 * выбора они не зависят: роль по режиму — знание Tags. Набор элемента ложится
 * на строку поверх роли кнопки — это проверяют спеки адаптеров.
 */
describe('роли списка и элемента', () => {
	it('список — listbox, элемент — option, и без движка', () => {
		expect(new TListBox().aria.get('role')).toBe('listbox')
		expect(new TListBoxItem().aria.get('role')).toBe('option')
	})

	it('режим выбора роли не меняет', () => {
		const { owner, facade, items } = createListBox(['a', 'b'])

		for (const mode of ['multiple', 'none', 'single'] as const) {
			facade.mode = mode

			expect(owner.aria.get('role')).toBe('listbox')
			expect(items.map((item) => item.aria.get('role'))).toEqual(['option', 'option'])
		}
	})
})

/**
 * Можно ли выбрать несколько, решает режим выбора — его знает коллекция, а не
 * список. Поэтому `aria-multiselectable` пишет `TListBoxExtension` в `aria`
 * владельца, как Select — в `listAria`, а Tags — в `aria` набора: в `multiple`
 * — `true`, в `single` и `none` атрибута нет.
 */
describe('aria-multiselectable у списка', () => {
	const multiselectable = (owner: TListBox) => owner.aria.get('aria-multiselectable')

	it.each([
		['multiple', 'true'],
		['single', undefined],
		['none', undefined],
	] as const)('mode="%s" — %s', (mode, expected) => {
		const owner = new TListBox()
		const facade = new TListBoxCollectionFacade({ mode }, { owner })

		expect(facade.mode).toBe(mode)
		expect(multiselectable(owner)).toBe(expected)
	})

	it('смена режима ставит и снимает атрибут — туда и обратно', () => {
		const { owner, facade } = createListBox(['a', 'b'])
		const seen: Array<string | undefined> = []

		for (const mode of ['multiple', 'single', 'multiple', 'none', 'multiple'] as const) {
			facade.mode = mode
			seen.push(multiselectable(owner))
		}

		expect(seen).toEqual(['true', undefined, 'true', undefined, 'true'])
	})

	/**
	 * Владелец — опция движка: он приходит к движку, собранному без него, и
	 * атрибут берёт по режиму, который у коллекции уже стоит. Дальше — на
	 * каждую смену режима.
	 */
	it('владелец, пришедший к готовому движку, получает его по текущему режиму', () => {
		const multiple = createEngineListBox()
		const single = createEngineListBox()
		const owner = new TListBox()
		const other = new TListBox()

		multiple.extensions.selection.mode = 'multiple'
		multiple.options.set({ owner })
		single.options.set({ owner: other })

		expect(multiselectable(owner)).toBe('true')
		expect(multiselectable(other)).toBeUndefined()

		multiple.extensions.selection.mode = 'single'
		single.extensions.selection.mode = 'multiple'

		expect(multiselectable(owner)).toBeUndefined()
		expect(multiselectable(other)).toBe('true')
	})
})
