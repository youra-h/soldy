import { describe, it, expect, vi } from 'vitest'
import {
	TItemGroup,
	TListBox,
	TListBoxCollectionFacade,
	TListBoxGroup,
	TMenuGroup,
	TSelect,
	TSelectCollectionFacade,
	TSelectGroup,
	TWindowStrategy,
	createEngineListBox,
	createEngineSelect,
	createEngineSelection,
} from '@soldy-ui/core'
import type { IListBoxItem, ISelectItem, TDrawnSection } from '@soldy-ui/core'

/**
 * Группы элементов ListBox и Select из данных — как у меню: метка `_.group`
 * или `groupBy`, порядок и подписи — `groups` (расширение `group` в наборах
 * обоих). Показанное идёт по группам, поэтому навигация, которая ходит по
 * показанному, идёт тем же порядком, что экран. Разметка рисует секции
 * нарисованного (`drawnSections`): группу — частью `ListBox.Group` или
 * `Select.Group`, между секциями — разделитель. Проекция группировки фасада —
 * общая база `TGroupCollectionFacade` трёх фасадов.
 *
 * Разметку секций проверяют спеки адаптеров (`ui/*\/__tests__/list-box*`),
 * рисование по секциям на голой коллекции — `collection.draw.spec.ts`.
 */

type TValued = { readonly value?: unknown }

const values = (items: ReadonlyArray<TValued>): unknown[] => items.map((item) => item.value)

/** Секции нарисованного коротко: ключ, подпись (`null` — без группы) и значения элементов. */
function brief(sections: ReadonlyArray<TDrawnSection<IListBoxItem | ISelectItem>>) {
	return sections.map(({ key, group, entries }) => [
		key,
		group === null ? null : (group.label ?? ''),
		entries.map((entry) => (entry.kind === 'item' ? entry.item.value : '…')),
	])
}

/** Данные владельца: метки групп вперемешку, «Морковь» — между фруктами. */
const MIXED = [
	{ value: 'apple', text: 'Яблоко', _: { group: 'fruit' } },
	{ value: 'carrot', text: 'Морковь', _: { group: 'veg' } },
	{ value: 'pear', text: 'Груша', _: { group: 'fruit' } },
	{ value: 'water', text: 'Вода' },
]

const GROUPS = [
	{ key: 'fruit', label: 'Фрукты' },
	{ key: 'veg', label: 'Овощи' },
]

describe('ListBox · группы', () => {
	it('у createEngineListBox: показанное по группам, состав — порядок данных', () => {
		const { batch, group, draw } = createEngineListBox({ items: MIXED }).extensions

		group.groups = GROUPS

		expect(values(batch.items)).toEqual(['apple', 'carrot', 'pear', 'water'])
		expect(values(batch.shown)).toEqual(['apple', 'pear', 'carrot', 'water'])
		expect(brief(draw.drawnSections)).toEqual([
			['group:fruit', 'Фрукты', ['apple', 'pear']],
			['group:veg', 'Овощи', ['carrot']],
			['free', null, ['water']],
		])
	})

	it('без меток — одна секция без группы, как прежде', () => {
		const { draw } = createEngineListBox({
			items: [{ value: 'a' }, { value: 'b' }],
		}).extensions

		expect(brief(draw.drawnSections)).toEqual([['free', null, ['a', 'b']]])
	})

	it('фасад: groupBy, groups и sections — проекция, drawnSections — рисование, события — пробросом', () => {
		const facade = new TListBoxCollectionFacade(
			{ items: [{ value: 'a' }, { value: 'b' }, { value: 'c' }] },
			{ owner: new TListBox() },
		)
		const sections = vi.fn()
		const drawnSections = vi.fn()
		const by = (item: IListBoxItem) => (item.value === 'c' ? 'last' : undefined)

		facade.events.on('change:sections', sections)
		facade.events.on('change:drawnSections', drawnSections)

		facade.groupBy = by
		facade.groups = [{ key: 'last', label: 'Последний' }]

		expect(facade.groupBy).toBe(by)
		expect(facade.groups).toEqual([{ key: 'last', label: 'Последний' }])
		expect(values(facade.shown)).toEqual(['c', 'a', 'b'])
		expect(facade.sections).toBe(facade.extensions.group.sections)
		expect(facade.drawnSections).toBe(facade.extensions.draw.drawnSections)
		expect(brief(facade.drawnSections)).toEqual([
			['group:last', 'Последний', ['c']],
			['free', null, ['a', 'b']],
		])
		expect(sections).toHaveBeenLastCalledWith(facade.sections)
		expect(drawnSections).toHaveBeenLastCalledWith(facade.drawnSections)
	})

	it('пропсы конструктора: группировка — до состава', () => {
		const facade = new TListBoxCollectionFacade(
			{
				items: [{ value: 'a' }, { value: 'b' }],
				groupBy: (item) => (item.value === 'b' ? 'first' : undefined),
				groups: [{ key: 'first', label: 'Первая' }],
			},
			{ owner: new TListBox() },
		)

		expect(values(facade.shown)).toEqual(['b', 'a'])
	})

	it('движок снаружи: фасад доставляет группировку, метки из данных доезжают', () => {
		const engine = createEngineSelection({ items: MIXED })
		const facade = new TListBoxCollectionFacade(
			{ groups: GROUPS },
			{ owner: new TListBox(), engine },
		)

		expect(engine.extensions.group).toBe(facade.extensions.group)
		expect(values(facade.shown)).toEqual(['apple', 'pear', 'carrot', 'water'])
	})

	it('снятые groupBy и groups возвращаются к умолчанию: групп нет', () => {
		expect(TListBoxCollectionFacade.defaultValues).toMatchObject({
			groupBy: undefined,
			groups: undefined,
		})
		expect('groupBy' in TListBoxCollectionFacade.defaultValues).toBe(true)
		expect('groups' in TListBoxCollectionFacade.defaultValues).toBe(true)
	})

	it('в окне: сгруппированный список окно не рисует, места в наборе нет', () => {
		const facade = new TListBoxCollectionFacade(
			{
				items: Array.from({ length: 200 }, (_, index) => ({
					value: `v${index + 1}`,
					_: { group: index < 100 ? 'first' : 'second' },
				})),
			},
			{ owner: new TListBox() },
		)
		const { draw, batch } = facade.extensions

		draw.useStrategy(new TWindowStrategy())
		draw.notifyViewport({ top: 3000, bottom: 3300, step: 30 })

		expect(draw.virtual).toBe(false)
		expect(facade.drawn).toHaveLength(200)
		expect(batch.items.some((item) => item.aria.has('aria-posinset'))).toBe(false)
	})
})

describe('Select · группы', () => {
	it('у createEngineSelect: показанное по группам, секции нарисованного', () => {
		const { batch, group, draw } = createEngineSelect({ items: MIXED }).extensions

		group.groups = GROUPS

		expect(values(batch.shown)).toEqual(['apple', 'pear', 'carrot', 'water'])
		expect(brief(draw.drawnSections)).toEqual([
			['group:fruit', 'Фрукты', ['apple', 'pear']],
			['group:veg', 'Овощи', ['carrot']],
			['free', null, ['water']],
		])
	})

	it('отбор убрал все опции группы — секции нет, вместе с подписью', () => {
		const facade = new TSelectCollectionFacade(
			{ items: MIXED, groups: GROUPS },
			{ owner: new TSelect() },
		)

		facade.extensions.filter.query = 'Морковь'

		expect(brief(facade.drawnSections)).toEqual([['group:veg', 'Овощи', ['carrot']]])

		facade.extensions.filter.query = 'р'

		// «Груша» и «Морковь»: отбор — до группировки, группы — в порядке `groups`
		expect(brief(facade.drawnSections)).toEqual([
			['group:fruit', 'Фрукты', ['pear']],
			['group:veg', 'Овощи', ['carrot']],
		])
	})

	it('фасад: проекция группировки из базы, пропсы — до состава', () => {
		const facade = new TSelectCollectionFacade(
			{
				items: [{ value: 'a' }, { value: 'b' }],
				groupBy: (item) => (item.value === 'b' ? 'first' : undefined),
				groups: [{ key: 'first', label: 'Первая' }],
			},
			{ owner: new TSelect() },
		)

		expect(values(facade.shown)).toEqual(['b', 'a'])
		expect(facade.groups).toEqual([{ key: 'first', label: 'Первая' }])
		expect(brief(facade.drawnSections)).toEqual([
			['group:first', 'Первая', ['b']],
			['free', null, ['a']],
		])
	})
})

describe('часть группы — общая база трёх форм', () => {
	it('группа списка — group, подпись — presentation (в listbox только опции и группы)', () => {
		for (const group of [new TListBoxGroup({ label: 'Фрукты' }), new TSelectGroup()]) {
			expect(group).toBeInstanceOf(TItemGroup)
			expect(group.aria.get('role')).toBe('group')
			expect(group.labelAria.get('role')).toBe('presentation')
		}
	})

	it('группа меню — group, у подписи роли нет', () => {
		const group = new TMenuGroup({ label: 'Вид' })

		expect(group).toBeInstanceOf(TItemGroup)
		expect(group.aria.get('role')).toBe('group')
		expect(group.labelAria.has('role')).toBe(false)
	})

	it('блок CSS — у формы, своего у базы нет', () => {
		expect(new TListBoxGroup().classes.toArray()).toContain('so-list-box-group')
		expect(new TSelectGroup().classes.toArray()).toContain('so-select-group')
		expect(new TMenuGroup().classes.toArray()).toContain('so-menu-group')
		expect(Object.hasOwn(TItemGroup, 'baseClass')).toBe(false)
	})

	it('подпись и её набор — общие: change:label и change:labelAria', () => {
		const group = new TListBoxGroup({ label: 'Фрукты' })
		const labels = vi.fn()
		const sets = vi.fn()

		group.events.on('change:label', labels)
		group.events.on('change:labelAria', sets)

		group.label = 'Фрукты'
		group.label = 'Ягоды'
		group.labelAria.add('id', 'x')

		expect(labels.mock.calls).toEqual([['Ягоды']])
		expect(sets).toHaveBeenCalledWith({ role: 'presentation', id: 'x' })
	})
})
