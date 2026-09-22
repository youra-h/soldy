/**
 * RadioGroup: «один из N» на активации коллекции.
 *
 * Радио нативные (`input[type=radio]`), поэтому ядро отвечает за то, чего
 * браузер не знает: общий `name` группы, свойства оформления на каждом радио
 * и связь `value` группы с отмеченным радио. Всё это держит одно расширение —
 * `TRadioGroupExtension`.
 */

import { describe, it, expect, vi } from 'vitest'
import {
	TRadioGroup,
	TRadioGroupItem,
	TRadioGroupCollectionFacade,
	TRadioGroupItemCollectionFacade,
	TItemContextRegistry,
	createEngine,
	createEngineRadioGroup,
} from '../src'
import type { IRadioGroupItem, IRadioGroupItemProps, IRadioGroupProps } from '@soldy-ui/core'

/** Группа с радио по значениям — так их регистрирует разметка, по одному. */
function createGroup(values: string[], props: Partial<IRadioGroupProps> = {}) {
	const owner = new TRadioGroup(props)
	const collection = new TRadioGroupCollectionFacade({}, { owner })
	const items = values.map((value) => new TRadioGroupItem({ value }))

	items.forEach((item) => collection.extensions.plain.push(item))

	const registry = new TItemContextRegistry(collection.engine.getCore())

	/** Фасад радио — через него разметка читает и пишет отметку. */
	const facadeFor = (index: number) => {
		const facade = new TRadioGroupItemCollectionFacade()

		facade.setContext(registry.get(items[index]))

		return facade
	}

	return { owner, collection, items, facadeFor }
}

/** Значения отмеченных радио — по `data-selected`, как их видит тема. */
const selectedValues = (items: readonly IRadioGroupItem[]) =>
	items.filter((item) => item.dataset.get('selected') === 'true').map((item) => item.value)

describe('TRadioGroup (чистый класс)', () => {
	it('группа знает о себе одно — она radiogroup', () => {
		const owner = new TRadioGroup()

		expect(owner.aria.get('role')).toBe('radiogroup')
		expect(owner.classes.toArray()).toContain('s-radio-group')
		expect(owner.value).toBeUndefined()
		expect(owner.view).toBeUndefined()
	})

	it('вид — модификатор с префиксом, смена шлёт change:view', () => {
		const owner = new TRadioGroup({ view: 'pip' })
		const onView = vi.fn()

		owner.events.on('change:view', onView)
		owner.view = 'halo'

		expect(owner.classes.toArray()).toContain('s-radio-group--view-halo')
		expect(owner.classes.toArray()).not.toContain('s-radio-group--view-pip')
		expect(onView).toHaveBeenCalledWith('halo')
		expect(owner.getProps()).toMatchObject({ view: 'halo' })
	})
})

describe('TRadioGroupItem (чистый класс)', () => {
	it('корень — label: клик по подписи выбирает радио', () => {
		const item = new TRadioGroupItem()

		expect(item.tag).toBe('label')
		expect(item.value).toBe('')
		expect(item.classes.toArray()).toContain('s-radio-group-item')
	})

	/**
	 * `aria` стоит на вложенном `input[type=radio]`: роль и отметку он сообщает
	 * сам (`checked`), а выключенность — нативным `disabled`.
	 */
	it('в aria нет ни роли, ни aria-checked, ни aria-disabled', () => {
		const item = new TRadioGroupItem({ disabled: true })

		expect(item.aria.has('role')).toBe(false)
		expect(item.aria.has('aria-checked')).toBe(false)
		expect(item.aria.has('aria-disabled')).toBe(false)
		expect(item.dataset.get('disabled')).toBe('true')
		// Корень-`label` нативного `disabled` не имеет
		expect(item.attrs.has('disabled')).toBe(false)
	})

	it('вид — модификатор корня', () => {
		const item = new TRadioGroupItem({ view: 'pip' })

		expect(item.classes.toArray()).toContain('s-radio-group-item--view-pip')

		item.view = undefined

		expect(item.classes.toArray().some((cls) => cls.includes('--view-'))).toBe(false)
	})
})

describe('общий name', () => {
	/** Без общего `name` браузер не соберёт радио в группу. */
	it('безымянная группа раздаёт имя от своего uid', () => {
		const { owner, collection, items } = createGroup(['a', 'b'])
		const name = collection.extensions.radioGroup.groupName

		expect(owner.name).toBe('')
		expect(name).toBe(`s-radio-group-${owner.uid}`)
		expect(items.map((item) => item.name)).toEqual([name, name])
	})

	it('две безымянные группы на странице не сливаются', () => {
		const first = createGroup(['a'])
		const second = createGroup(['a'])

		expect(first.items[0].name).not.toBe(second.items[0].name)
	})

	it('своё имя группы уходит всем радио, в том числе при смене', () => {
		const { owner, items } = createGroup(['a', 'b'], { name: 'delivery' })

		expect(items.map((item) => item.name)).toEqual(['delivery', 'delivery'])

		owner.name = 'pickup'

		expect(items.map((item) => item.name)).toEqual(['pickup', 'pickup'])

		owner.name = ''

		expect(items[0].name).toBe(`s-radio-group-${owner.uid}`)
	})
})

describe('свойства группы на радио', () => {
	it('добавленное радио получает size, variant и view группы', () => {
		const { items } = createGroup(['a', 'b'], { size: 'lg', variant: 'brand', view: 'halo' })

		for (const item of items) {
			expect(item.size).toBe('lg')
			expect(item.variant).toBe('brand')
			expect(item.view).toBe('halo')
			expect(item.classes.toArray()).toContain('s-radio-group-item--view-halo')
		}
	})

	it('смена у группы доходит до каждого радио', () => {
		const { owner, items } = createGroup(['a', 'b'])

		owner.size = 'sm'
		owner.variant = 'danger'
		owner.view = 'pip'

		expect(items.map((item) => item.size)).toEqual(['sm', 'sm'])
		expect(items.map((item) => item.variant)).toEqual(['danger', 'danger'])
		expect(items.map((item) => item.view)).toEqual(['pip', 'pip'])

		owner.view = undefined

		expect(items.map((item) => item.view)).toEqual([undefined, undefined])
	})

	/**
	 * Движок собран снаружи и наполнен до привязки: этим радио `item:added`
	 * уже не придёт, и расширение обязано их догнать.
	 */
	it('радио из движка, собранного снаружи, догоняются при привязке', () => {
		const owner = new TRadioGroup({ view: 'halo', name: 'city' })
		const engine = createEngine({ items: [{ value: 'a' }, { value: 'b' }] })
		const collection = new TRadioGroupCollectionFacade({}, { owner, engine })

		expect(collection.items.every((item) => item instanceof TRadioGroupItem)).toBe(true)
		expect(collection.items.map((item) => item.view)).toEqual(['halo', 'halo'])
		expect(collection.items.map((item) => item.name)).toEqual(['city', 'city'])
	})
})

describe('value ↔ отмеченное радио', () => {
	it('значение отмечает радио', () => {
		const { owner, collection, items } = createGroup(['a', 'b', 'c'])

		owner.value = 'b'

		expect(collection.activeItem).toBe(items[1])
		expect(selectedValues(items)).toEqual(['b'])
	})

	it('отметка радио пишет значение', () => {
		const { owner, collection, items } = createGroup(['a', 'b', 'c'])

		collection.activate(items[2])

		expect(owner.value).toBe('c')
	})

	it('через фасад радио — то, что делает разметка на change', () => {
		const { owner, facadeFor } = createGroup(['a', 'b'])
		const facade = facadeFor(1)
		const onActive = vi.fn()

		facade.events.on('change:active', onActive)
		facade.active = true

		expect(owner.value).toBe('b')
		expect(facade.active).toBe(true)
		expect(onActive).toHaveBeenCalled()
		expect(facadeFor(0).active).toBe(false)
	})

	/**
	 * Значение приходит пропом сразу, а радио регистрируются при монтировании
	 * — позже. Без повтора на `item:added` заданное значение терялось бы.
	 */
	it('значение, заданное до регистрации радио, отмечает его при добавлении', () => {
		const { owner, collection, items } = createGroup(['a', 'b'], { value: 'b' })

		expect(owner.value).toBe('b')
		expect(collection.activeItem).toBe(items[1])
	})

	it('значение без радио снимает отметку, но остаётся ждать своё радио', () => {
		const { owner, collection } = createGroup(['a', 'b'], { value: 'a' })

		owner.value = 'z'

		expect(collection.activeItem).toBeUndefined()
		expect(owner.value).toBe('z')

		const late = new TRadioGroupItem({ value: 'z' })

		collection.extensions.plain.push(late)

		expect(collection.activeItem).toBe(late)
	})

	it('пустая строка и undefined — «не отмечено ничего»', () => {
		const { owner, collection } = createGroup(['a', ''], { value: 'a' })

		owner.value = ''

		expect(collection.activeItem).toBeUndefined()

		owner.value = 'a'
		owner.value = undefined

		expect(collection.activeItem).toBeUndefined()
	})

	it('meta.active из данных пишет значение группы', () => {
		const owner = new TRadioGroup()
		const collection = new TRadioGroupCollectionFacade(
			{ items: [{ value: 'a' }, { value: 'b', _: { active: true } }] },
			{ owner },
		)

		expect(collection.activeItem?.value).toBe('b')
		expect(owner.value).toBe('b')
	})

	/**
	 * Движок собран снаружи уже с отмеченным радио, у группы значения нет:
	 * направление на старте — от коллекции, иначе пустое значение затёрло бы
	 * отметку. Заданное значение, наоборот, главнее отметки из данных.
	 */
	it('направление на старте — от того, у кого есть что сказать', () => {
		const items = [{ value: 'a' }, { value: 'b', _: { active: true } }]

		const empty = new TRadioGroup()
		const fromEngine = createEngineRadioGroup({ owner: empty, items })

		expect(fromEngine.extensions.activation.activeItem?.value).toBe('b')
		expect(empty.value).toBe('b')

		const valued = new TRadioGroup({ value: 'a' })
		const fromValue = createEngineRadioGroup({ owner: valued, items })

		expect(fromValue.extensions.activation.activeItem?.value).toBe('a')
		expect(valued.value).toBe('a')
	})

	/**
	 * Удаление — не выбор: отметку снимает активация, а значение остаётся и
	 * ждёт своё радио, как у ListBox. Радио уходит и на время — `v-if`,
	 * размонтирование группы целиком, — и `v-model` стирался бы вместе с ним.
	 */
	it('удаление отмеченного радио снимает отметку, но не значение', () => {
		const { owner, collection, items } = createGroup(['a', 'b', 'c'], { value: 'b' })

		collection.extensions.plain.remove(items[1])

		expect(collection.activeItem).toBeUndefined()
		expect(owner.value).toBe('b')

		collection.extensions.plain.push(items[1])

		expect(collection.activeItem).toBe(items[1])
	})

	/**
	 * Разметка пишет `items` ещё раз после конструктора фасада: без `trackBy`
	 * запись — очистка и новый набор. Значение переживает её и отмечает радио
	 * нового набора.
	 */
	it('повторная запись состава сохраняет значение', () => {
		const owner = new TRadioGroup({ value: 'b' })
		const collection = new TRadioGroupCollectionFacade(
			{ items: [{ value: 'a' }, { value: 'b' }] },
			{ owner },
		)

		collection.items = [{ value: 'a' }, { value: 'b' }]

		expect(owner.value).toBe('b')
		expect(collection.activeItem?.value).toBe('b')
		expect(collection.activeItem).toBe(collection.items[1])
	})

	/** Снять отметку с радио, оставшегося в группе, — это выбор «ничего». */
	it('снятая с радио отметка обнуляет значение', () => {
		const { owner, facadeFor } = createGroup(['a', 'b'], { value: 'b' })

		facadeFor(1).active = false

		expect(owner.value).toBeUndefined()
	})

	/** Удаление соседа отметку не трогает — активация не ищет замену сама. */
	it('удаление неотмеченного радио значение не меняет', () => {
		const { owner, collection, items } = createGroup(['a', 'b', 'c'], { value: 'b' })

		collection.extensions.plain.remove(items[0])

		expect(collection.activeItem).toBe(items[1])
		expect(owner.value).toBe('b')
	})

	/** Отмечать выключенное из кода — право приложения, как `select` у списка. */
	it('значение отмечает и выключенное радио', () => {
		const { owner, collection, items } = createGroup(['a', 'b'])

		items[1].disabled = true
		owner.value = 'b'

		expect(collection.activeItem).toBe(items[1])
	})

	/** Синхронизация в обе стороны — самое место для бесконечного цикла. */
	it('не зацикливается: одна смена — одно change:value', () => {
		const { owner, collection, items } = createGroup(['a', 'b'])
		const onValue = vi.fn()

		owner.events.on('change:value', onValue)
		collection.activate(items[1])
		owner.value = 'a'

		expect(onValue).toHaveBeenCalledTimes(2)
		expect(collection.activeItem).toBe(items[0])
	})

	it('data-selected — только у отмеченного радио, у остальных "false"', () => {
		const { owner, items } = createGroup(['a', 'b'], { value: 'a' })

		expect(items.map((item) => item.dataset.get('selected'))).toEqual(['true', 'false'])

		owner.value = 'b'

		expect(items.map((item) => item.dataset.get('selected'))).toEqual(['false', 'true'])
	})
})

describe('createEngineRadioGroup', () => {
	it('без owner — ошибка сборки, а не молчаливо неполный набор', () => {
		expect(() =>
			// @ts-expect-error — owner обязателен
			createEngineRadioGroup({}),
		).toThrow(/owner/)
	})

	it('радио из данных — инстансы TRadioGroupItem', () => {
		const owner = new TRadioGroup()
		const props: IRadioGroupItemProps = { value: 'a' }
		const engine = createEngineRadioGroup({ owner, items: [props] })

		expect(engine.extensions.batch.items[0]).toBeInstanceOf(TRadioGroupItem)
	})
})
