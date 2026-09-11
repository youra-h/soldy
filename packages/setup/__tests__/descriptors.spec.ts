import { describe, it, expect } from 'vitest'
import {
	TButton,
	TComponentView,
	TDragAndDrop,
	TListBox,
	TTabs,
	TAccordion,
	TListBoxCollectionFacade,
	TListBoxItemCollectionFacade,
	TTabsCollectionFacade,
	TTabsItemCollectionFacade,
	TAccordionCollectionFacade,
	TAccordionItemCollectionFacade,
	TSelect,
	TSelectItem,
	TSelectCollectionFacade,
	TSelectItemCollectionFacade,
} from '@soldy/core'
import {
	TElementPlugin,
	TReadyPlugin,
	TDragPlugin,
	TDismissPlugin,
	TCollectionBundlesPlugin,
	TListKeyboardPlugin,
	TListHeightPlugin,
	TListItemPlugin,
} from '@soldy/plugins'
import {
	ButtonDescriptor,
	ComponentViewDescriptor,
	DragAndDropDescriptor,
	ListBoxDescriptor,
	ListBoxCollectionDescriptor,
	ListBoxCollectionItemDescriptor,
	TabsDescriptor,
	TabsCollectionDescriptor,
	TabsCollectionItemDescriptor,
	AccordionDescriptor,
	AccordionCollectionDescriptor,
	AccordionCollectionItemDescriptor,
	SelectDescriptor,
	SelectItemDescriptor,
	SelectCollectionDescriptor,
	SelectCollectionItemDescriptor,
} from '@soldy/setup'

const propNames = (d: { props: Array<{ name: { name: string } }> }) =>
	d.props.map((p) => p.name.name)

const eventNames = (d: { events: Array<{ name: string }> }) => d.events.map((e) => e.name)

describe('дескрипторы компонентов (наследование)', () => {
	it('ButtonDescriptor наследует цепочку Entity → Component → ComponentView → Stylable → Control → Textable', () => {
		const d = ButtonDescriptor()

		expect(d.ctor).toBe(TButton)

		const names = propNames(d)
		for (const expected of [
			'ctrl', // Entity
			'rendered',
			'visible',
			'present', // Component
			'tag',
			'classes', // ComponentView
			'size',
			'variant', // Stylable
			'disabled',
			'focused', // Control
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
		expect(accessor.getEvents().some((e) => e.name.getName() === 'element:ready')).toBe(true)
	})

	it('ButtonDescriptor.getProps/getEvents агрегируют собственные и плагинные объявления', () => {
		const d = ButtonDescriptor()

		// Собственные props (без плагинов — у Element/Ready их нет)
		const props = d.getProps().map((p) => p.name.name)
		for (const expected of ['view', 'text', 'disabled', 'tag', 'classes']) {
			expect(props).toContain(expected)
		}

		// Плагинные события попадают в getEvents с namespace
		const events = d.getEvents().map((e) => e.getName())
		expect(events).toContain('element:ready')
		expect(events).toContain('element:removed')
		// Собственные события тоже присутствуют
		expect(events).toContain('ready')
		expect(events).toContain('show')
	})

	it('ComponentViewDescriptor содержит Element/Ready, DragAndDropDescriptor — нет', () => {
		const cv = ComponentViewDescriptor()
		const cvBundle = cv.createBundle(new TComponentView())
		expect(cvBundle!.get(TElementPlugin)).toBeInstanceOf(TElementPlugin)

		const dd = DragAndDropDescriptor()
		expect(dd.ctor).toBe(TDragAndDrop)
		expect(dd.createBundle(new TDragAndDrop())).toBeNull()
	})

	it('ListBoxDescriptor наследует ValueControl и добавляет view + Drag-плагин', () => {
		const d = ListBoxDescriptor()
		expect(d.ctor).toBe(TListBox)

		const names = propNames(d)
		expect(names).toContain('value') // ValueControl
		expect(names).toContain('size') // Stylable
		expect(names).toContain('view') // ListBox

		expect(d.plugins.some((p) => p.ctor === TDragPlugin)).toBe(true)
	})

	/**
	 * Списочные свойства объявляет **компонент**, а не плагин, и лежат они в
	 * `props`, а не только в `getProps()`.
	 *
	 * Проверка неслучайная. Один заход эти свойства уже пережили: они переехали
	 * в `TListLayoutPlugin`, и ядро перестало быть самодостаточным —
	 * `new TListBox({ maxRows: 5 })` молча не срабатывал. Тест ловит возврат к
	 * той схеме: у плагина проп оказался бы только в `getProps()`.
	 */
	it.each([
		['ListBoxDescriptor', ListBoxDescriptor],
		['SelectDescriptor', SelectDescriptor],
	])('%s объявляет списочные свойства сам', (_name, factory) => {
		const own = propNames(factory())

		for (const prop of ['maxRows', 'contentFit', 'scrollBehavior']) {
			expect(own).toContain(prop)
		}
	})

	/**
	 * Дескриптор — единственное место, где видно, что плагин высоты подключён:
	 * его собственные тесты собирают плагин руками и молчаливую потерю проводки
	 * не заметят.
	 */
	it.each([
		['ListBoxDescriptor', ListBoxDescriptor],
		['SelectDescriptor', SelectDescriptor],
	])('%s подключает плагин высоты', (_name, factory) => {
		expect(factory().plugins.map((p) => p.ctor)).toContain(TListHeightPlugin)
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

	it('AccordionDescriptor наследует Control и добавляет view', () => {
		const d = AccordionDescriptor()
		expect(d.ctor).toBe(TAccordion)

		const names = propNames(d)
		expect(names).toContain('disabled') // Control
		expect(names).toContain('view') // Accordion
	})
})

describe('дескрипторы коллекций (фасады)', () => {
	it('ListBoxCollectionDescriptor наследует общий Collection (items, trackBy)', () => {
		const d = ListBoxCollectionDescriptor()

		expect(d.ctor).toBe(TListBoxCollectionFacade)

		const names = propNames(d)
		expect(names).toContain('items') // Collection
		expect(names).toContain('trackBy') // Collection
		expect(names).toContain('mode') // ListBoxCollection
		expect(names).toContain('selected') // ListBoxCollection (protected)

		expect(eventNames(d)).toContain('engine:create')
	})

	it('ListBoxCollectionItemDescriptor объявляет item-пропсы (selected, order, view)', () => {
		const d = ListBoxCollectionItemDescriptor()

		expect(d.ctor).toBe(TListBoxItemCollectionFacade)

		const names = propNames(d)
		expect(names).toContain('selected')
		expect(names).toContain('order')
		expect(names).toContain('view')

		// `list_wordWrap` отсюда ушёл: разрешение «элемент поверх списка»
		// делает расширение коллекции, а не фасад
		expect(names).not.toContain('list_wordWrap')

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

		expect(d.ctor).toBe(TTabsItemCollectionFacade)

		const names = propNames(d)
		expect(names).toContain('active')
		expect(names).toContain('order')
		expect(names).toContain('tab_closable')
	})

	it('AccordionCollectionDescriptor наследует Collection и добавляет mode/selected', () => {
		const d = AccordionCollectionDescriptor()

		expect(d.ctor).toBe(TAccordionCollectionFacade)

		const names = propNames(d)
		expect(names).toContain('items')
		expect(names).toContain('mode')
		expect(names).toContain('selected')
	})

	it('AccordionCollectionItemDescriptor объявляет selected/order/view', () => {
		const d = AccordionCollectionItemDescriptor()

		expect(d.ctor).toBe(TAccordionItemCollectionFacade)

		const names = propNames(d)
		expect(names).toContain('selected')
		expect(names).toContain('order')
		expect(names).toContain('view')
	})
})

describe('Select', () => {
	it('SelectDescriptor наследует InputControl и добавляет состояние панели', () => {
		const d = SelectDescriptor()

		expect(d.ctor).toBe(TSelect)

		const names = propNames(d)

		// От InputControl вниз по цепочке
		expect(names).toContain('value')
		expect(names).toContain('name')
		expect(names).toContain('readonly')
		expect(names).toContain('required')
		expect(names).toContain('disabled')

		// Своё
		expect(names).toContain('open')
		expect(names).toContain('placeholder')
		expect(names).toContain('closeOnSelect')
		expect(names).toContain('clearable')
	})

	it('multiple отдельным пропом не заводится — это mode коллекции', () => {
		// Два имени для одного состояния однажды разошлись бы
		expect(propNames(SelectDescriptor())).not.toContain('multiple')
		expect(propNames(SelectCollectionDescriptor())).toContain('mode')
	})

	it('подключает слой оверлея и реестры коллекции', () => {
		const ctors = SelectDescriptor().plugins.map((p) => p.ctor)

		expect(ctors).toContain(TDismissPlugin)
		expect(ctors).toContain(TCollectionBundlesPlugin)
	})

	it('клавиатуру списка не подключает — у combobox своя модель фокуса', () => {
		// Фокус не уходит с поля, поэтому keydown ловит поле, а не список
		expect(SelectDescriptor().plugins.map((p) => p.ctor)).not.toContain(TListKeyboardPlugin)
	})

	it('SelectItemDescriptor даёт подсветку через плагин элемента списка', () => {
		const d = SelectItemDescriptor()

		expect(d.ctor).toBe(TSelectItem)
		expect(d.plugins.map((p) => p.ctor)).toContain(TListItemPlugin)
		expect(propNames(d)).toContain('text')
	})

	it('SelectCollectionDescriptor отдаёт текст выбранного и ARIA списка', () => {
		const d = SelectCollectionDescriptor()

		expect(d.ctor).toBe(TSelectCollectionFacade)

		const names = propNames(d)

		expect(names).toContain('items')
		expect(names).toContain('text')
		expect(names).toContain('list_aria')
	})

	it('SelectCollectionItemDescriptor объявляет только членство в коллекции', () => {
		const d = SelectCollectionItemDescriptor()

		expect(d.ctor).toBe(TSelectItemCollectionFacade)

		const names = propNames(d)

		expect(names).toContain('selected')
		expect(names).toContain('order')
		// Собственные пропсы опции приходят из SelectItemDescriptor
		expect(names).not.toContain('text')
	})

	it('accessor собирается — значит одноимённых пропсов нет', () => {
		// TAccessor бросает на дубль имени; собрать его — единственный способ
		// поймать столкновение между компонентом, коллекцией и плагинами
		const owner = new TSelect()
		const descriptor = SelectDescriptor()

		expect(() => descriptor.createAccessor(owner, descriptor.createBundle(owner))).not.toThrow()

		const item = new TSelectItem()
		const itemDescriptor = SelectItemDescriptor()

		expect(() =>
			itemDescriptor.createAccessor(item, itemDescriptor.createBundle(item)),
		).not.toThrow()
	})
})
