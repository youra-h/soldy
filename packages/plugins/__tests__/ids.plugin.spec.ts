/**
 * `id` в разметке — от монтирования, плагинами связок.
 *
 * Ядро `id` не строит: они нужны только документу, и на сервере и в браузере
 * обязаны совпасть. Набор плагинов получает id монтирования (`mountId`) от
 * адаптера — тот берёт его у `useId` фреймворка, — и плагины строят из него `id`
 * частей (`createId`): `<mountId>-<часть>`. Формула связки одна, в плагине, и
 * обе её стороны пишутся в наборы компонента.
 */

import { describe, it, expect } from 'vitest'
import {
	TAccordionItem,
	TCalendar,
	TCalendarCollectionFacade,
	TDateInput,
	TDialog,
	TDrawer,
	TPopover,
	TRadioGroup,
	TRadioGroupCollectionFacade,
	TRadioGroupItem,
	TSelect,
	TSelectItem,
	TTabsItem,
	TTooltip,
} from '@soldy-ui/core'
import type { IRadioGroupItem } from '@soldy-ui/core'
import {
	TAccordionItemIdsPlugin,
	TCalendarIdsPlugin,
	TCollectionBundlesPlugin,
	TDateInputIdsPlugin,
	TDialogIdsPlugin,
	TDismissPlugin,
	TModalIdsPlugin,
	TPluginBundle,
	TPopoverIdsPlugin,
	TRadioGroupNamePlugin,
	TSelectIdsPlugin,
	TSelectItemIdsPlugin,
	TTabsItemIdsPlugin,
	TTooltipIdsPlugin,
} from '../src'

describe('id монтирования', () => {
	it('id части — <mountId>-<часть>', () => {
		expect(new TPluginBundle({}, 'v-3').createId('panel')).toBe('v-3-panel')
	})

	it('без id монтирования — свой у каждого набора', () => {
		expect(new TPluginBundle({}).createId('panel')).not.toBe(
			new TPluginBundle({}).createId('panel'),
		)
	})

	it('id — у монтирования: новое монтирование того же экземпляра пишет свои', () => {
		const popover = new TPopover()

		new TPluginBundle(popover, 'm1').use(TPopoverIdsPlugin)

		const first = popover.aria.get('id')

		new TPluginBundle(popover, 'm2').use(TPopoverIdsPlugin)

		expect(first).toBe('m1-panel')
		expect(popover.aria.get('id')).toBe('m2-panel')
	})
})

describe('оверлеи', () => {
	it('Popover: id панели и aria-controls триггера — один id', () => {
		const popover = new TPopover()

		new TPluginBundle(popover, 'm1').use(TPopoverIdsPlugin)

		expect(popover.aria.get('id')).toBe('m1-panel')
		expect(popover.triggerAria.get('aria-controls')).toBe('m1-panel')
	})

	it('Tooltip: ссылка триггера по режиму, ровно одна', () => {
		const tooltip = new TTooltip()

		new TPluginBundle(tooltip, 'm1').use(TTooltipIdsPlugin)

		expect(tooltip.aria.get('id')).toBe('m1-panel')
		expect(tooltip.triggerAria.toObject()).toEqual({ 'aria-describedby': 'm1-panel' })

		tooltip.type = 'label'

		expect(tooltip.triggerAria.toObject()).toEqual({ 'aria-labelledby': 'm1-panel' })

		tooltip.type = 'description'

		expect(tooltip.triggerAria.toObject()).toEqual({ 'aria-describedby': 'm1-panel' })
	})

	it('Drawer: имя — заголовок', () => {
		const drawer = new TDrawer()

		new TPluginBundle(drawer, 'm1').use(TModalIdsPlugin)

		expect(drawer.titleAria.toObject()).toEqual({ id: 'm1-title' })
		expect(drawer.aria.get('aria-labelledby')).toBe('m1-title')
	})

	it('Dialog: имя — заголовок, описание предупреждения — тело', () => {
		const dialog = new TDialog()

		new TPluginBundle(dialog, 'm1').use(TDialogIdsPlugin)

		expect(dialog.aria.get('aria-labelledby')).toBe('m1-title')
		expect(dialog.bodyAria.toObject()).toEqual({ id: 'm1-body' })
		expect(dialog.aria.has('aria-describedby')).toBe(false)

		dialog.alert = true

		expect(dialog.aria.get('aria-describedby')).toBe('m1-body')

		dialog.alert = false

		expect(dialog.aria.has('aria-describedby')).toBe(false)
	})

	it('пометка панели владельцем — от монтирования', () => {
		const bundle = new TPluginBundle(new TPopover(), 'm1').use(TDismissPlugin)

		expect(bundle.get(TDismissPlugin)?.ownerAttribute).toEqual({ 'data-owner': 'm1-owner' })
	})
})

describe('коллекции', () => {
	it('Select: id списка и aria-controls поля', () => {
		const select = new TSelect()

		new TPluginBundle(select, 'm1').use(TSelectIdsPlugin)

		expect(select.listAria.get('id')).toBe('m1-list')
		expect(select.field.aria.get('aria-controls')).toBe('m1-list')
	})

	it('Select.Item: id опции — от её монтирования', () => {
		const option = new TSelectItem({ value: 'a' })

		new TPluginBundle(option, 'm2').use(TSelectItemIdsPlugin)

		expect(option.aria.get('id')).toBe('m2-option')
	})

	it('Tabs.Item: id таба и aria-controls его панели', () => {
		const tab = new TTabsItem({ value: 'a' })

		new TPluginBundle(tab, 'm1').use(TTabsItemIdsPlugin)

		expect(tab.aria.get('id')).toBe('m1-tab')
		expect(tab.aria.get('aria-controls')).toBe('m1-panel')
	})

	it('Accordion.Item: заголовок и панель ссылаются друг на друга', () => {
		const section = new TAccordionItem({ value: 'a' })

		new TPluginBundle(section, 'm1').use(TAccordionItemIdsPlugin)

		expect(section.aria.get('id')).toBe('m1-header')
		expect(section.aria.get('aria-controls')).toBe('m1-content')
		expect(section.contentAria.toObject()).toEqual({
			role: 'region',
			id: 'm1-content',
			'aria-labelledby': 'm1-header',
		})
	})

	it('Calendar: сетку называет заголовок её места, и листание его не меняет', () => {
		const owner = new TCalendar({ months: ['2026-01-01', '2026-02-01'] })
		const collection = new TCalendarCollectionFacade({}, { owner })
		const bundle = new TPluginBundle(owner, 'm1')
			.use(TCollectionBundlesPlugin)
			.use(TCalendarIdsPlugin)
		const titles = () => collection.grids.map(({ titleAria }) => titleAria.id)

		bundle.get(TCollectionBundlesPlugin)?.bindEngine(collection.engine)

		expect(titles()).toEqual(['m1-title-0', 'm1-title-1'])
		expect(collection.grids.map(({ gridAria }) => gridAria['aria-labelledby'])).toEqual([
			'm1-title-0',
			'm1-title-1',
		])

		collection.extensions.view.showNext()

		expect(titles()).toEqual(['m1-title-0', 'm1-title-1'])

		// Мест стало больше — новое тоже названо
		owner.months = ['2026-01-01', '2026-02-01', '2026-03-01']

		expect(titles()).toEqual(['m1-title-0', 'm1-title-1', 'm1-title-2'])
	})

	it('Calendar: панель выбора месяца и года называет её шапка — на каждом месте', () => {
		const owner = new TCalendar({ months: ['2026-01-01', '2026-02-01'] })
		const collection = new TCalendarCollectionFacade({}, { owner })
		const bundle = new TPluginBundle(owner, 'm1')
			.use(TCollectionBundlesPlugin)
			.use(TCalendarIdsPlugin)
		const headings = () => collection.pickers.map(({ labelledBy }) => labelledBy)

		bundle.get(TCollectionBundlesPlugin)?.bindEngine(collection.engine)

		expect(headings()).toEqual(['m1-picker-0', 'm1-picker-1'])
		expect(collection.pickers.map(({ headingAria }) => headingAria.id)).toEqual([
			'm1-picker-0',
			'm1-picker-1',
		])

		owner.months = ['2026-01-01', '2026-02-01', '2026-03-01']

		expect(headings()).toEqual(['m1-picker-0', 'm1-picker-1', 'm1-picker-2'])
	})
})

describe('поле даты', () => {
	it('DateInput: id каждой части — от монтирования и её типа, смена локали его не меняет', () => {
		const input = new TDateInput({ locale: 'ru-RU' })

		new TPluginBundle(input, 'm1').use(TDateInputIdsPlugin)

		const ids = () =>
			input.segments.flatMap((segment) =>
				segment.type === 'literal' ? [] : [[segment.type, segment.aria.id]],
			)

		expect(ids()).toEqual([
			['day', 'm1-day'],
			['month', 'm1-month'],
			['year', 'm1-year'],
		])

		// Части переставились, а их `id` остались с ними
		input.locale = 'en-US'

		expect(ids()).toEqual([
			['month', 'm1-month'],
			['day', 'm1-day'],
			['year', 'm1-year'],
		])
	})
})

describe('общий name радио', () => {
	function group(name?: string) {
		const owner = new TRadioGroup(name === undefined ? {} : { name })
		const collection = new TRadioGroupCollectionFacade({}, { owner })
		const bundle = new TPluginBundle(owner, 'm1')
			.use(TCollectionBundlesPlugin)
			.use(TRadioGroupNamePlugin)

		collection.items = [
			new TRadioGroupItem({ value: 'a' }),
			new TRadioGroupItem({ value: 'b' }),
		] as IRadioGroupItem[]
		bundle.get(TCollectionBundlesPlugin)?.bindEngine(collection.engine)

		const names = () => collection.items.map((item) => item.name)

		return { owner, collection, names }
	}

	it('безымянная группа — id монтирования: две такие группы не сольются', () => {
		expect(group().names()).toEqual(['m1-group', 'm1-group'])
	})

	it('своё имя группы — всем радио, и на смену', () => {
		const { owner, names } = group('delivery')

		expect(names()).toEqual(['delivery', 'delivery'])

		owner.name = 'pickup'

		expect(names()).toEqual(['pickup', 'pickup'])

		owner.name = ''

		expect(names()).toEqual(['m1-group', 'm1-group'])
	})

	it('радио, вставленное позже, получает то же имя', () => {
		const { collection, names } = group('city')

		collection.extensions.plain.push(new TRadioGroupItem({ value: 'c' }))

		expect(names()).toEqual(['city', 'city', 'city'])
	})
})
