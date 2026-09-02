import { describe, it, expect } from 'vitest'
import {
	TButton,
	TComponentView,
	TDragAndDrop,
	TList,
	TListBox,
	TTabs,
	TCollapse,
	TListCollectionFacade,
	TListItemCollectionFacade,
	TListBoxCollectionFacade,
	TListBoxItemCollectionFacade,
	TTabsCollectionFacade,
	TTabItemCollectionFacade,
	TCollapseCollectionFacade,
	TCollapseItemCollectionFacade,
} from '@soldy/core'
import {
	TElementPlugin,
	TReadyPlugin,
	TDragPlugin,
} from '@soldy/plugins'
import {
	ButtonDescriptor,
	ComponentViewDescriptor,
	DragAndDropDescriptor,
	ListDescriptor,
	ListBoxDescriptor,
	ListCollectionDescriptor,
	ListCollectionItemDescriptor,
	ListBoxCollectionDescriptor,
	ListBoxCollectionItemDescriptor,
	TabsDescriptor,
	TabsCollectionDescriptor,
	TabsCollectionItemDescriptor,
	CollapseDescriptor,
	CollapseCollectionDescriptor,
	CollapseCollectionItemDescriptor,
} from '@soldy/setup'

const propNames = (d: { props: Array<{ name: { name: string } }> }) =>
	d.props.map((p) => p.name.name)

const eventNames = (d: { events: Array<{ name: string }> }) =>
	d.events.map((e) => e.name)

describe('дескрипторы компонентов (наследование)', () => {
	it('ButtonDescriptor наследует цепочку Entity → Component → ComponentView → Stylable → Control → Textable', () => {
		const d = ButtonDescriptor()

		expect(d.ctor).toBe(TButton)

		const names = propNames(d)
		for (const expected of [
			'ctrl', // Entity
			'rendered', 'visible', 'present', // Component
			'tag', 'classes', // ComponentView
			'size', 'variant', // Stylable
			'disabled', 'focused', // Control
			'text', // Textable
			'view', // Button
		]) {
			expect(names).toContain(expected)
		}

		const events = eventNames(d)
		expect(events).toContain('show') // Component
		expect(events).toContain('ready') // ComponentView
	})

	it('ButtonDescriptor создаёт бандл с Element и Ready плагинами', () => {
		const d = ButtonDescriptor()
		const instance = new TButton()
		const bundle = d.createBundle(instance)

		expect(bundle).not.toBeNull()
		expect(bundle!.get(TElementPlugin)).toBeInstanceOf(TElementPlugin)
		expect(bundle!.get(TReadyPlugin)).toBeInstanceOf(TReadyPlugin)
	})

	it('ButtonDescriptor accessor привязывает собственные props к instance', () => {
		const d = ButtonDescriptor()
		const instance = new TButton()
		const bundle = d.createBundle(instance)
		const accessor = d.createAccessor(instance, bundle)

		const viewProp = accessor.getProps().find((p) => p.name.name === 'view')!
		expect(viewProp.instance).toBe(instance)

		// Плагины дают события с namespace
		expect(
			accessor.getEvents().some((e) => e.name.getName() === 'element:ready'),
		).toBe(true)
	})

	it('ComponentViewDescriptor содержит Element/Ready, DragAndDropDescriptor — нет', () => {
		const cv = ComponentViewDescriptor()
		const cvBundle = cv.createBundle(new TComponentView())
		expect(cvBundle!.get(TElementPlugin)).toBeInstanceOf(TElementPlugin)

		const dd = DragAndDropDescriptor()
		expect(dd.ctor).toBe(TDragAndDrop)
		expect(dd.createBundle(new TDragAndDrop())).toBeNull()
	})

	it('ListDescriptor наследует Control и добавляет maxRows', () => {
		const d = ListDescriptor()
		expect(d.ctor).toBe(TList)

		const names = propNames(d)
		for (const expected of ['maxRows', 'autoWidth', 'wordWrap', 'scrollBehavior', 'size', 'variant']) {
			expect(names).toContain(expected)
		}
	})

	it('ListBoxDescriptor наследует List и добавляет view + Drag-плагин', () => {
		const d = ListBoxDescriptor()
		expect(d.ctor).toBe(TListBox)

		const names = propNames(d)
		expect(names).toContain('maxRows') // List
		expect(names).toContain('view') // ListBox

		expect(d.plugins.some((p) => p.ctor === TDragPlugin)).toBe(true)
	})

	it('TabsDescriptor наследует Control и добавляет orientation/view + Drag-плагин', () => {
		const d = TabsDescriptor()
		expect(d.ctor).toBe(TTabs)

		const names = propNames(d)
		expect(names).toContain('disabled') // Control
		expect(names).toContain('orientation') // Tabs
		expect(names).toContain('view') // Tabs

		expect(d.plugins.some((p) => p.ctor === TDragPlugin)).toBe(true)
	})

	it('CollapseDescriptor наследует Control и добавляет view', () => {
		const d = CollapseDescriptor()
		expect(d.ctor).toBe(TCollapse)

		const names = propNames(d)
		expect(names).toContain('disabled') // Control
		expect(names).toContain('view') // Collapse
	})
})

describe('дескрипторы коллекций (фасады)', () => {
	it('ListCollectionDescriptor наследует общий Collection (items, trackBy)', () => {
		const d = ListCollectionDescriptor()

		expect(d.ctor).toBe(TListCollectionFacade)

		const names = propNames(d)
		expect(names).toContain('items') // Collection
		expect(names).toContain('trackBy') // Collection
		expect(names).toContain('mode') // List
		expect(names).toContain('selected') // List (protected)

		expect(eventNames(d)).toContain('engine:create')
	})

	it('ListCollectionItemDescriptor объявляет item-пропсы (selected, order)', () => {
		const d = ListCollectionItemDescriptor()

		expect(d.ctor).toBe(TListItemCollectionFacade)

		const names = propNames(d)
		expect(names).toContain('selected')
		expect(names).toContain('order')
		expect(names).toContain('list_wordWrap')
	})

	it('ListBoxCollectionDescriptor наследует ListCollection', () => {
		const d = ListBoxCollectionDescriptor()

		expect(d.ctor).toBe(TListBoxCollectionFacade)

		const names = propNames(d)
		expect(names).toContain('items') // Collection
		expect(names).toContain('mode') // ListCollection
	})

	it('ListBoxCollectionItemDescriptor наследует ListCollectionItem и добавляет view', () => {
		const d = ListBoxCollectionItemDescriptor()

		expect(d.ctor).toBe(TListBoxItemCollectionFacade)

		const names = propNames(d)
		expect(names).toContain('selected') // ListCollectionItem
		expect(names).toContain('view') // ListBoxCollectionItem

		const view = d.props.find((p) => p.name.name === 'view')!
		expect(view.protected).toBe(true)
	})

	it('TabsCollectionDescriptor добавляет activeItem и события активации', () => {
		const d = TabsCollectionDescriptor()

		expect(d.ctor).toBe(TTabsCollectionFacade)

		const names = propNames(d)
		expect(names).toContain('items')
		expect(names).toContain('activeItem')

		const events = eventNames(d)
		expect(events).toContain('item:activated')
		expect(events).toContain('item:close')
	})

	it('TabsCollectionItemDescriptor объявляет active/order/tab_closable', () => {
		const d = TabsCollectionItemDescriptor()

		expect(d.ctor).toBe(TTabItemCollectionFacade)

		const names = propNames(d)
		expect(names).toContain('active')
		expect(names).toContain('order')
		expect(names).toContain('tab_closable')
	})

	it('CollapseCollectionDescriptor наследует Collection и добавляет mode/selected', () => {
		const d = CollapseCollectionDescriptor()

		expect(d.ctor).toBe(TCollapseCollectionFacade)

		const names = propNames(d)
		expect(names).toContain('items')
		expect(names).toContain('mode')
		expect(names).toContain('selected')
	})

	it('CollapseCollectionItemDescriptor объявляет selected/order/view', () => {
		const d = CollapseCollectionItemDescriptor()

		expect(d.ctor).toBe(TCollapseItemCollectionFacade)

		const names = propNames(d)
		expect(names).toContain('selected')
		expect(names).toContain('order')
		expect(names).toContain('view')
	})
})
