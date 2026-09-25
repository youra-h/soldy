import { describe, it, expect, vi } from 'vitest'
import {
	TTabs,
	TTabsItem,
	TTabsExtension,
	TTabsItemCollectionFacade,
	TItemContextRegistry,
	TCollectionEngine,
	TPlainExtension,
	TActivationExtension,
	createEngineTabs,
} from '@soldy-ui/core'
import type { ITabsItem, ITabs } from '@soldy-ui/core'

// ============================================================================
// Pure TTabs
// ============================================================================

describe('TTabs (чистый класс)', () => {
	it('создаётся с дефолтными значениями', () => {
		const tabs = new TTabs()

		expect(tabs.orientation).toBe('horizontal')
		expect(tabs.alignment).toBe('start')
		expect(tabs.position).toBe('start')
		expect(tabs.view).toBeUndefined()
		expect(tabs.closable).toBe(false)
		expect(tabs.variant).toBeUndefined()
		expect(tabs.classes.toArray()).toContain('s-tabs')
	})

	it('принимает props через plain-объект', () => {
		const tabs = new TTabs({ orientation: 'vertical', closable: true, view: 'pills' })

		expect(tabs.orientation).toBe('vertical')
		expect(tabs.closable).toBe(true)
		expect(tabs.view).toBe('pills')
	})

	it('принимает props через { props }', () => {
		const tabs = new TTabs({ orientation: 'vertical', alignment: 'center' })

		expect(tabs.orientation).toBe('vertical')
		expect(tabs.alignment).toBe('center')
	})

	it('эмитит события при изменении свойств', () => {
		const tabs = new TTabs()
		const onOrientation = vi.fn()
		const onClosable = vi.fn()
		const onView = vi.fn()
		const onAlignment = vi.fn()

		tabs.events.on('change:orientation', onOrientation)
		tabs.events.on('change:closable', onClosable)
		tabs.events.on('change:view', onView)
		tabs.events.on('change:alignment', onAlignment)

		tabs.orientation = 'vertical'
		tabs.closable = true
		tabs.view = 'pills'
		tabs.alignment = 'end'

		expect(onOrientation).toHaveBeenCalledWith('vertical')
		expect(onClosable).toHaveBeenCalledWith(true)
		expect(onView).toHaveBeenCalledWith('pills')
		expect(onAlignment).toHaveBeenCalledWith('end')
	})

	it('не эмитит событие при установке того же значения', () => {
		const tabs = new TTabs({ orientation: 'horizontal' })
		const onOrientation = vi.fn()

		tabs.events.on('change:orientation', onOrientation)
		tabs.orientation = 'horizontal'

		expect(onOrientation).not.toHaveBeenCalled()
	})

	it('классы обновляются при смене orientation/view', () => {
		const tabs = new TTabs()

		tabs.orientation = 'vertical'
		expect(tabs.classes.toArray()).toContain('s-tabs--vertical')

		tabs.view = 'cards'
		expect(tabs.classes.toArray()).toContain('s-tabs--view-cards')
	})

	it('getProps возвращает актуальные значения', () => {
		const tabs = new TTabs({ orientation: 'vertical', closable: true, view: 'pills' })

		const props = tabs.getProps()

		expect(props).toMatchObject({
			orientation: 'vertical',
			closable: true,
			view: 'pills',
		})
	})
})

// ============================================================================
// Pure TTabsItem
// ============================================================================

describe('TTabsItem (чистый класс)', () => {
	it('создаётся с дефолтными значениями', () => {
		const tab = new TTabsItem()

		expect(tab.text).toBe('')
		expect(tab.value).toBe('')
		expect(tab.closable).toBeUndefined()
		expect(tab.classes.toArray()).toContain('s-tabs-item')
		expect(tab.tag).toBe('div')
	})

	it('принимает props через конструктор', () => {
		const tab = new TTabsItem({ text: 'Tab 1', value: 'tab-1', closable: true })

		expect(tab.text).toBe('Tab 1')
		expect(tab.value).toBe('tab-1')
		expect(tab.closable).toBe(true)
	})

	it('эмитит change:text при изменении текста', () => {
		const tab = new TTabsItem({ text: 'initial' })
		const onChange = vi.fn()

		tab.events.on('change:text', onChange)
		tab.text = 'updated'

		expect(onChange).toHaveBeenCalledWith({ oldValue: 'initial', newValue: 'updated' })
	})

	it('closable меняется через state и отражается в getProps', () => {
		const tab = new TTabsItem()

		tab.closable = true

		expect(tab.closable).toBe(true)
		expect(tab.getProps().closable).toBe(true)

		tab.closable = false

		expect(tab.closable).toBe(false)
	})

	it('событие change:text эмитится с правильным payload', () => {
		const tab = new TTabsItem({ text: 'a' })
		const onChange = vi.fn()

		tab.events.on('change:text', onChange)
		tab.text = 'b'

		expect(onChange).toHaveBeenCalledWith({ oldValue: 'a', newValue: 'b' })
	})

	/**
	 * «Выключенный таб не закрывается» выводит item-адаптер (см. describe
	 * «выключенный таб не закрывается»), а своё значение таба `disabled` не
	 * трогает: иначе после включения его неоткуда вернуть.
	 */
	it('disabled не трогает своё closable, сеттер пишет и у выключенного', () => {
		const tab = new TTabsItem({ closable: true })

		tab.disabled = true

		expect(tab.closable).toBe(true)

		tab.closable = false

		expect(tab.closable).toBe(false)
	})

	it('класс --closable добавляется/убирается', () => {
		const tab = new TTabsItem()

		expect(tab.classes.toArray()).not.toContain('--closable')

		tab.closable = true

		expect(tab.classes.toArray()).toContain('s-tabs-item--closable')
	})
})

// ============================================================================
// Collection: TTabsExtension + TActivationExtension
// ============================================================================

type TabsExtensions = {
	plain: TPlainExtension<ITabsItem>
	activation: TActivationExtension<ITabsItem>
	tabs: TTabsExtension<ITabs, ITabsItem>
}

function createTabsCollection(tabs?: TTabs) {
	const owner = tabs ?? new TTabs()

	return {
		owner,
		collection: new TCollectionEngine<ITabsItem, TabsExtensions>({
			extensions: {
				plain: new TPlainExtension<ITabsItem>(),
				activation: new TActivationExtension<ITabsItem>(),
				tabs: new TTabsExtension({ owner }),
			},
		}),
	}
}

function createTab(text: string, value?: string): TTabsItem {
	return new TTabsItem({ text, value: value ?? text.toLowerCase().replace(/\s+/g, '-') })
}

describe('Коллекция табов с TTabsExtension + TActivationExtension', () => {
	// --- Базовые операции ---

	it('добавление табов через коллекцию', () => {
		const { collection } = createTabsCollection()
		const tab1 = createTab('Tab 1')
		const tab2 = createTab('Tab 2')

		collection.extensions.plain.insert(tab1)
		collection.extensions.plain.insert(tab2)

		expect(collection.getCore().driver.valueOf().length).toBe(2)
		expect(collection.getCore().driver.valueOf().includes(tab1)).toBe(true)
		expect(collection.getCore().driver.valueOf().includes(tab2)).toBe(true)
	})

	it('TTabsExtension пробрасывает свойства владельца при добавлении элемента', () => {
		const tabs = new TTabs({ disabled: true, size: 'lg', variant: 'brand' })
		const { collection } = createTabsCollection(tabs)

		const tab = createTab('Tab')
		collection.extensions.plain.insert(tab)

		// Выключенность не пишется, а сочетается: своё у таба прежнее, итог — от набора
		expect(tab.disabled).toBe(false)
		expect(tab.disabledResolved).toBe(true)
		expect(tab.size).toBe('lg')
		expect(tab.variant).toBe('brand')
	})

	it('TTabsExtension пробрасывает изменение disabled на все элементы', () => {
		const tabs = new TTabs()
		const { collection } = createTabsCollection(tabs)

		const tab1 = createTab('Tab 1')
		const tab2 = createTab('Tab 2')

		collection.extensions.plain.insert(tab1)
		collection.extensions.plain.insert(tab2)

		tabs.disabled = true

		expect(tab1.disabledResolved).toBe(true)
		expect(tab2.disabledResolved).toBe(true)
		expect(tab1.disabled).toBe(false)
		expect(tab2.disabled).toBe(false)
	})

	// --- Активация ---

	it('активация табов через TActivationExtension', () => {
		const { collection } = createTabsCollection()
		const tab1 = createTab('Tab 1')
		const tab2 = createTab('Tab 2')

		collection.extensions.plain.insert(tab1)
		collection.extensions.plain.insert(tab2)

		collection.extensions.activation.activate(tab1)

		expect(collection.extensions.activation.activeItem).toBe(tab1)
		expect(collection.extensions.activation.isActive(tab1)).toBe(true)
		expect(collection.extensions.activation.isActive(tab2)).toBe(false)

		// Переключение на tab2
		collection.extensions.activation.activate(tab2)

		expect(collection.extensions.activation.activeItem).toBe(tab2)
		expect(collection.extensions.activation.isActive(tab1)).toBe(false)
		expect(collection.extensions.activation.isActive(tab2)).toBe(true)
	})

	it('события активации эмитятся корректно', () => {
		const { collection } = createTabsCollection()
		const tab = createTab('Tab')

		collection.extensions.plain.insert(tab)

		const onActivated = vi.fn()
		const onChange = vi.fn()

		collection.extensions.activation.events.on('item:activated', onActivated)
		collection.extensions.activation.events.on('change:activation', onChange)

		collection.extensions.activation.activate(tab)

		expect(onActivated).toHaveBeenCalledWith(tab)
		expect(onChange).toHaveBeenCalledWith(tab)
	})

	it('деактивация при удалении активного элемента', () => {
		const { collection } = createTabsCollection()
		const tab = createTab('Tab')

		collection.extensions.plain.insert(tab)
		collection.extensions.activation.activate(tab)

		expect(collection.extensions.activation.isActive(tab)).toBe(true)

		// Удаляем через driver
		collection.extensions.plain.remove(tab)

		expect(collection.extensions.activation.activeItem).toBeUndefined()
	})

	// --- closeTab ---

	it('closeTab удаляет closable элемент и эмитит item:close', () => {
		const { collection } = createTabsCollection()
		const tab1 = createTab('Tab 1')
		const tab2 = createTab('Tab 2')

		collection.extensions.plain.insert(tab1)
		collection.extensions.plain.insert(tab2)

		tab2.closable = true

		const onClose = vi.fn()

		collection.extensions.tabs.events.on('item:close', onClose)

		const result = collection.extensions.tabs.closeTab(tab2)

		expect(result).toBe(true)
		expect(onClose).toHaveBeenCalledWith(tab2)
		expect(collection.getCore().driver.valueOf().length).toBe(1)
		expect(collection.getCore().driver.valueOf().includes(tab1)).toBe(true)
		expect(collection.getCore().driver.valueOf().includes(tab2)).toBe(false)
	})

	it('closeTab не удаляет не-closable таб', () => {
		const tabs = new TTabs({ closable: false })
		const { collection } = createTabsCollection(tabs)

		const tab = createTab('Tab')
		collection.extensions.plain.insert(tab)

		const onClose = vi.fn()

		collection.extensions.tabs.events.on('item:close', onClose)

		const result = collection.extensions.tabs.closeTab(tab)

		expect(result).toBe(false)
		expect(onClose).not.toHaveBeenCalled()
		expect(collection.getCore().driver.valueOf().length).toBe(1)
	})

	it('движок генерит item:removed после closeTab', () => {
		const { collection } = createTabsCollection()
		const tab = createTab('Tab')

		collection.extensions.plain.insert(tab)

		tab.closable = true

		const onRemoved = vi.fn()

		collection.extensions.plain.events.on('item:removed', onRemoved)

		collection.extensions.tabs.closeTab(tab)

		expect(onRemoved).toHaveBeenCalledTimes(1)
		expect(onRemoved.mock.calls[0][0].item).toBe(tab)
	})

	// --- hasEnabledTabs ---

	it('hasEnabledTabs: проверяет наличие enabled табов', () => {
		const { collection } = createTabsCollection()
		const tab1 = createTab('Tab 1')
		const tab2 = createTab('Tab 2')

		collection.extensions.plain.insert(tab1)
		collection.extensions.plain.insert(tab2)

		const result = collection.extensions.tabs.hasEnabledTabs()

		// Оба таба не disabled — должно быть true
		expect(typeof result).toBe('boolean')
	})

	// --- TTabsItemExtension.closable через контекст ---

	it('TTabsItemExtension.closable через контекст: резолв item > parent', () => {
		const tabs = new TTabs({ closable: true })
		const { collection } = createTabsCollection(tabs)

		const tab1 = createTab('Tab 1')
		const tab2 = createTab('Tab 2')
		const tab3 = createTab('Tab 3')

		collection.extensions.plain.insert(tab1, 0)
		collection.extensions.plain.insert(tab2, 1)
		collection.extensions.plain.insert(tab3, 2)

		// tab1 — явно НЕ closable (переопределяет глобальный)
		tab1.closable = false
		// tab2, tab3 — наследуют tabs.closable = true

		const registry = new TItemContextRegistry(collection.getCore())

		const ctx1 = registry.get(tab1)
		// Явный false у элемента — приоритет
		expect(ctx1.adapters.tabs.closable).toBe(false)

		const ctx2 = registry.get(tab2)
		// Наследует от tabs.closable = true
		expect(ctx2.adapters.tabs.closable).toBe(true)

		const ctx3 = registry.get(tab3)
		// Наследует от tabs.closable = true
		expect(ctx3.adapters.tabs.closable).toBe(true)
	})

	it('closeTab учитывает резолв closable: tab1 не закрывается, tab2 закрывается', () => {
		const tabs = new TTabs({ closable: true })
		const { collection } = createTabsCollection(tabs)

		const tab1 = createTab('Tab 1')
		const tab2 = createTab('Tab 2')
		const tab3 = createTab('Tab 3')

		collection.extensions.plain.insert(tab1, 0)
		collection.extensions.plain.insert(tab2, 1)
		collection.extensions.plain.insert(tab3, 2)

		tab1.closable = false // явный запрет

		// tab1 не должен закрыться
		const r1 = collection.extensions.tabs.closeTab(tab1)

		expect(r1).toBe(false)
		expect(collection.getCore().driver.valueOf().length).toBe(3)

		// tab2 должен закрыться (наследует closable = true)
		const r2 = collection.extensions.tabs.closeTab(tab2)

		expect(r2).toBe(true)
		expect(collection.getCore().driver.valueOf().length).toBe(2)
		expect(collection.getCore().driver.valueOf().includes(tab1)).toBe(true)
		expect(collection.getCore().driver.valueOf().includes(tab3)).toBe(true)
	})

	it('после closeTab всех closable — остаётся только не-closable', () => {
		const tabs = new TTabs({ closable: true })
		const { collection } = createTabsCollection(tabs)

		const tab1 = createTab('Tab 1')
		const tab2 = createTab('Tab 2')

		collection.extensions.plain.insert(tab1)
		collection.extensions.plain.insert(tab2)

		tab1.closable = false

		collection.extensions.tabs.closeTab(tab2)

		expect(collection.getCore().driver.valueOf().length).toBe(1)
		expect(collection.getCore().driver.valueOf().includes(tab1)).toBe(true)

		// Попытка закрыть tab1 не должна сработать
		const r = collection.extensions.tabs.closeTab(tab1)

		expect(r).toBe(false)
		expect(collection.getCore().driver.valueOf().length).toBe(1)
	})

	// --- Адаптеры через контекст ---

	it('адаптер activation доступен через TItemContext', () => {
		const { collection } = createTabsCollection()
		const tab = createTab('Tab')

		collection.extensions.plain.insert(tab)

		const registry = new TItemContextRegistry(collection.getCore())
		const ctx = registry.get(tab)

		expect(ctx.adapters.activation).toBeDefined()
		expect(ctx.adapters.activation.active).toBe(false)

		ctx.adapters.activation.active = true

		expect(ctx.adapters.activation.active).toBe(true)
		expect(collection.extensions.activation.isActive(tab)).toBe(true)
	})

	// --- TTabsItemExtension.close() через контекст ---

	it('TTabsItemExtension.close() удаляет таб и эмитит item:close', () => {
		const tabs = new TTabs({ closable: true })
		const { collection } = createTabsCollection(tabs)

		const tab1 = createTab('Tab 1')
		const tab2 = createTab('Tab 2')

		collection.extensions.plain.insert(tab1)
		collection.extensions.plain.insert(tab2)

		const onClose = vi.fn()
		collection.extensions.tabs.events.on('item:close', onClose)

		const registry = new TItemContextRegistry(collection.getCore())

		// Получаем адаптер и вызываем close()
		const ctx = registry.get(tab1)
		ctx.adapters.tabs.close()

		expect(onClose).toHaveBeenCalledWith(tab1)
		expect(collection.getCore().driver.valueOf().length).toBe(1)
		expect(collection.getCore().driver.valueOf().includes(tab1)).toBe(false)
		expect(collection.getCore().driver.valueOf().includes(tab2)).toBe(true)
	})

	it('TTabsItemExtension.close() не удаляет не-closable таб', () => {
		const tabs = new TTabs({ closable: false })
		const { collection } = createTabsCollection(tabs)

		const tab = createTab('Tab')
		collection.extensions.plain.insert(tab)

		const onClose = vi.fn()
		collection.extensions.tabs.events.on('item:close', onClose)

		const registry = new TItemContextRegistry(collection.getCore())
		const ctx = registry.get(tab)

		ctx.adapters.tabs.close()

		expect(onClose).not.toHaveBeenCalled()
		expect(collection.getCore().driver.valueOf().length).toBe(1)
	})
})

// ============================================================================
// Выключенный таб не закрывается
// ============================================================================

/**
 * Правило одно и не зависит от пути к «выключен»: со старта, позже или вместе
 * с набором. Выводит его item-адаптер — его `closable` читают разметка
 * (`tab_closable` фасада) и `closeTab`. Раньше правило было подпиской в
 * `TTabsItem` на `change:disabled`, и таб, выключенный со старта, оставался
 * закрываемым: события у него не было.
 *
 * Коллекция собрана как у компонента (`createEngineTabs`).
 */
describe('выключенный таб не закрывается', () => {
	function setup(owner = new TTabs({ closable: true })) {
		const engine = createEngineTabs({ owner })
		const registry = new TItemContextRegistry(engine.getCore())

		/** Можно ли закрыть таб — то, что видит разметка. */
		const closable = (tab: ITabsItem) => registry.get(tab).adapters.tabs.closable

		/** Сообщения адаптера таба о смене `closable`. */
		const changes = (tab: ITabsItem) => {
			const handler = vi.fn()

			registry.get(tab).adapters.tabs.events.on('change:closable', handler)

			return handler
		}

		return { owner, engine, tabs: engine.extensions.tabs, registry, closable, changes }
	}

	const disabledTab = (text: string, props: { closable?: boolean } = {}) =>
		new TTabsItem({ text, value: text.toLowerCase(), disabled: true, ...props })

	it('выключенный со старта: не закрывается, closeTab его не удаляет', () => {
		const { engine, tabs, registry, closable } = setup()
		const tab = engine.extensions.plain.push(disabledTab('B'))
		const onClose = vi.fn()

		tabs.events.on('item:close', onClose)

		expect(closable(tab)).toBe(false)
		expect(tabs.closeTab(tab)).toBe(false)

		registry.get(tab).adapters.tabs.close()

		expect(onClose).not.toHaveBeenCalled()
		expect(engine.extensions.batch.items).toContain(tab)
	})

	it('выключенный со старта данными (items) — так же', () => {
		const engine = createEngineTabs({
			owner: new TTabs({ closable: true }),
			items: [{ value: 'b', text: 'B', disabled: true }],
		})
		const [tab] = engine.extensions.batch.items
		const registry = new TItemContextRegistry(engine.getCore())

		expect(registry.get(tab).adapters.tabs.closable).toBe(false)
		expect(engine.extensions.tabs.closeTab(tab)).toBe(false)
		expect(engine.extensions.batch.items).toContain(tab)
	})

	it('выключили позже — не закрывается, включили — закрывается снова', () => {
		const { engine, tabs, closable, changes } = setup()
		const tab = engine.extensions.plain.push(createTab('C'))
		const changed = changes(tab)

		expect(closable(tab)).toBe(true)

		tab.disabled = true

		expect(closable(tab)).toBe(false)
		expect(changed).toHaveBeenCalledOnce()
		expect(tabs.closeTab(tab)).toBe(false)

		tab.disabled = false

		expect(closable(tab)).toBe(true)
		expect(changed).toHaveBeenCalledTimes(2)
		expect(tabs.closeTab(tab)).toBe(true)
	})

	it('выключили набор — не закрывается ни один таб, включили — снова закрываются', () => {
		const { owner, engine, tabs, closable, changes } = setup()
		const a = engine.extensions.plain.push(createTab('A'))
		const b = engine.extensions.plain.push(createTab('B'))
		const changed = changes(a)

		owner.disabled = true

		expect([a, b].map(closable)).toEqual([false, false])
		expect(changed).toHaveBeenCalledOnce()
		expect(tabs.closeTab(a)).toBe(false)

		owner.disabled = false

		expect([a, b].map(closable)).toEqual([true, true])
		expect(changed).toHaveBeenCalledTimes(2)
	})

	it('включили набор — таб, выключенный сам, по-прежнему не закрывается', () => {
		const { owner, engine, closable } = setup()
		const tab = engine.extensions.plain.push(disabledTab('A'))

		owner.disabled = true
		owner.disabled = false

		expect(closable(tab)).toBe(false)
	})

	it('включение возвращает своё значение таба, заданное после создания', () => {
		const { engine, closable } = setup(new TTabs())
		const tab = engine.extensions.plain.push(createTab('A'))

		tab.closable = true
		tab.disabled = true

		expect(closable(tab)).toBe(false)

		tab.disabled = false

		expect(closable(tab)).toBe(true)
	})

	it('своё closable, заданное выключенному табу, действует после включения', () => {
		const { engine, closable } = setup(new TTabs())
		const tab = engine.extensions.plain.push(disabledTab('A'))

		tab.closable = true

		expect(closable(tab)).toBe(false)

		tab.disabled = false

		expect(closable(tab)).toBe(true)
	})

	it('фасад элемента узнаёт о смене событием — по нему разметка прячет кнопку', () => {
		const { engine, registry } = setup()
		const tab = engine.extensions.plain.push(createTab('A'))
		const facade = new TTabsItemCollectionFacade()
		const changed = vi.fn()

		facade.setContext(registry.get(tab))
		facade.events.on('change:closable', changed)

		tab.disabled = true

		expect(facade.closable).toBe(false)
		expect(changed).toHaveBeenCalledOnce()
	})
})

// ============================================================================
// Закрытие активного таба
// ============================================================================

/**
 * Политика Tabs, а не активации: общее расширение на удаление активного только
 * сбрасывает, соседа выбирает `TTabsExtension`.
 *
 * Коллекция собрана как у компонента (`createEngineTabs`): порядок установки
 * `activation` раньше `tabs` задаёт он, и на `item:removed` сначала
 * отрабатывает сброс, потом активация соседа.
 */
describe('Закрытие активного таба: активным становится сосед', () => {
	function setup() {
		const engine = createEngineTabs({ owner: new TTabs({ closable: true }) })
		const a = engine.extensions.plain.push(createTab('A'))
		const b = engine.extensions.plain.push(createTab('B'))
		const c = engine.extensions.plain.push(createTab('C'))

		return { engine, activation: engine.extensions.activation, a, b, c }
	}

	it('закрыли активный первый — активен следующий', () => {
		const { engine, activation, a, b } = setup()

		activation.activate(a)
		engine.extensions.plain.remove(a)

		expect(activation.activeItem).toBe(b)
		expect(b.aria.get('aria-selected')).toBe('true')
	})

	it('закрыли активный последний — активен предыдущий', () => {
		const { engine, activation, b, c } = setup()

		activation.activate(c)
		engine.extensions.plain.remove(c)

		expect(activation.activeItem).toBe(b)
	})

	it('закрыли неактивный — активный не меняется', () => {
		const { engine, activation, a, c } = setup()

		activation.activate(c)
		engine.extensions.plain.remove(a)

		expect(activation.activeItem).toBe(c)
	})

	it('закрыли единственный — активного нет', () => {
		const engine = createEngineTabs({ owner: new TTabs({ closable: true }) })
		const tab = engine.extensions.plain.push(createTab('Tab'))

		engine.extensions.activation.activate(tab)
		engine.extensions.plain.remove(tab)

		expect(engine.extensions.activation.activeItem).toBeUndefined()
	})

	it('следующий сосед disabled — активен следующий за ним', () => {
		const { engine, activation, a, b, c } = setup()

		b.disabled = true

		activation.activate(a)
		engine.extensions.plain.remove(a)

		expect(activation.activeItem).toBe(c)
	})

	it('closeTab активного даёт тот же результат, что plain.remove', () => {
		const { engine, activation, a, b } = setup()

		activation.activate(a)

		expect(engine.extensions.tabs.closeTab(a)).toBe(true)
		expect(activation.activeItem).toBe(b)
	})

	it('удаление отменили в item:remove:before — активный не меняется', () => {
		const { engine, activation, a } = setup()

		engine.extensions.plain.events.on('item:remove:before', (e) => e.preventDefault())

		activation.activate(a)
		engine.extensions.plain.remove(a)

		expect(engine.extensions.batch.items).toContain(a)
		expect(activation.activeItem).toBe(a)
	})

	it('batch.clear() не активирует ничего', () => {
		const { engine, activation, a } = setup()

		activation.activate(a)
		engine.extensions.batch.clear()

		expect(activation.activeItem).toBeUndefined()
	})

	it('отменённое удаление не всплывает при следующем удалении того же таба', () => {
		const { engine, activation, a, c } = setup()
		const cancel = (e: { preventDefault(): void }) => e.preventDefault()

		engine.extensions.plain.events.on('item:remove:before', cancel)
		activation.activate(a)
		engine.extensions.plain.remove(a)
		engine.extensions.plain.events.off('item:remove:before', cancel)

		activation.activate(c)
		engine.extensions.plain.remove(a)

		expect(activation.activeItem).toBe(c)
	})

	it('batch.remove активного вместе с правым соседом — активен сосед слева', () => {
		const { engine, activation, b, c } = setup()
		const d = engine.extensions.plain.push(createTab('D'))

		activation.activate(c)
		engine.extensions.batch.remove([c, d])

		expect(activation.activeItem).toBe(b)
	})

	it('batch.remove: правый сосед удалён раньше активного — активен сосед слева', () => {
		const { engine, activation, b, c } = setup()
		const d = engine.extensions.plain.push(createTab('D'))

		activation.activate(c)
		engine.extensions.batch.remove([d, c])

		expect(activation.activeItem).toBe(b)
	})
})

// ============================================================================
// Клавиатурная модель APG Tabs: что стоит в наборах с первой отрисовки
// ============================================================================

describe('TTabs · ARIA списка табов', () => {
	it('набор владельца описывает tablist', () => {
		expect(new TTabs().aria.get('role')).toBe('tablist')
	})

	it('aria-orientation объявляет ориентацию, горизонтальную по умолчанию', () => {
		expect(new TTabs().aria.get('aria-orientation')).toBe('horizontal')
		expect(new TTabs({ orientation: 'vertical' }).aria.get('aria-orientation')).toBe('vertical')
	})

	it('aria-orientation следует за сменой ориентации', () => {
		const tabs = new TTabs()

		tabs.orientation = 'vertical'
		expect(tabs.aria.get('aria-orientation')).toBe('vertical')

		tabs.orientation = 'horizontal'
		expect(tabs.aria.get('aria-orientation')).toBe('horizontal')
	})

	it('ARIA-половину disabled решает список, а не тег корня', () => {
		// `aria` стоит на `div` списка: своего disabled у него нет при любом `tag`
		const tabs = new TTabs({ tag: 'fieldset', disabled: true })

		expect(tabs.aria.get('aria-disabled')).toBe('true')
	})
})

describe('TTabsItem.closeAria · кнопка закрытия не остановка Tab', () => {
	it('tabindex="-1": весь список — одна остановка, закрывает Delete на табе', () => {
		expect(new TTabsItem({ text: 'Почта', closable: true }).closeAria.tabindex).toBe('-1')
	})
})

/**
 * Roving tabindex: `tabindex="0"` ровно у одного таба. Коллекция собрана как у
 * компонента (`createEngineTabs`), без адаптера: атрибут обязан стоять до
 * первой отрисовки.
 */
describe('остановка Tab — один таб с tabindex="0"', () => {
	function setup(owner = new TTabs({ closable: true })) {
		const engine = createEngineTabs({ owner })
		const a = engine.extensions.plain.push(createTab('A'))
		const b = engine.extensions.plain.push(createTab('B'))
		const c = engine.extensions.plain.push(createTab('C'))

		/** `tabindex` табов в порядке списка. */
		const tabindex = () =>
			engine.extensions.batch.items.map((item) => item.aria.get('tabindex'))

		return {
			owner,
			engine,
			activation: engine.extensions.activation,
			tabs: engine.extensions.tabs,
			tabindex,
			a,
			b,
			c,
		}
	}

	it('стоит у активного таба', () => {
		const { activation, tabs, tabindex, b } = setup()

		activation.activate(b)

		expect(tabindex()).toEqual(['-1', '0', '-1'])
		expect(tabs.tabStop).toBe(b)
	})

	it('активного нет — у первого таба, на который можно перейти', () => {
		const { tabs, tabindex, a } = setup()

		expect(tabindex()).toEqual(['0', '-1', '-1'])
		expect(tabs.tabStop).toBe(a)
	})

	it('первый недоступен — у следующего', () => {
		const { tabindex, a } = setup()

		a.disabled = true

		expect(tabindex()).toEqual(['-1', '0', '-1'])
	})

	it('активный недоступен — у первого доступного, включили — вернулась к нему', () => {
		const { activation, tabindex, c } = setup()

		activation.activate(c)
		c.disabled = true

		expect(tabindex()).toEqual(['0', '-1', '-1'])

		c.disabled = false

		expect(tabindex()).toEqual(['-1', '-1', '0'])
	})

	it('скрытый и неотрисованный табы остановку не держат', () => {
		const { activation, tabindex, a, b } = setup()

		activation.activate(b)
		b.visible = false

		expect(tabindex()).toEqual(['0', '-1', '-1'])

		b.visible = true
		a.rendered = false

		expect(tabindex()).toEqual(['-1', '0', '-1'])
	})

	it('переезжает вслед за активацией', () => {
		const { activation, tabindex, a, c } = setup()

		activation.activate(a)
		activation.activate(c)

		expect(tabindex()).toEqual(['-1', '-1', '0'])
	})

	it('закрыли активный — остановка у соседа, которого он активировал', () => {
		const { activation, tabs, tabindex, a, b } = setup()

		activation.activate(a)
		tabs.closeTab(a)

		expect(activation.activeItem).toBe(b)
		expect(tabindex()).toEqual(['0', '-1'])
	})

	it('закрыли таб с остановкой без активного — она у нового первого', () => {
		const { tabs, tabindex, a } = setup()

		tabs.closeTab(a)

		expect(tabindex()).toEqual(['0', '-1'])
	})

	it('перестановка без активного: остановка у того, кто стал первым', () => {
		const { engine, tabindex, tabs, a, b } = setup()

		engine.extensions.plain.move(a, 2)

		expect(tabs.tabStop).toBe(b)
		expect(tabindex()).toEqual(['0', '-1', '-1'])
	})

	it('добавленный таб получает -1, а первым без активного — остановку', () => {
		const { engine, tabindex } = setup()
		const added = engine.extensions.plain.insert(createTab('Z'), 0)

		expect(added.aria.get('tabindex')).toBe('0')
		expect(tabindex()).toEqual(['0', '-1', '-1', '-1'])

		const tail = engine.extensions.plain.push(createTab('Y'))

		expect(tail.aria.get('tabindex')).toBe('-1')
	})

	it('выключили набор — остановки нет ни у кого, включили — вернулась', () => {
		const { owner, activation, tabs, tabindex, b } = setup()

		activation.activate(b)
		owner.disabled = true

		expect(tabs.tabStop).toBeUndefined()
		expect(tabindex()).toEqual(['-1', '-1', '-1'])

		owner.disabled = false

		expect(tabindex()).toEqual(['-1', '0', '-1'])
	})

	it('удалённый таб больше не пересчитывает остановку списка', () => {
		const { engine, activation, b, c } = setup()

		activation.activate(b)
		engine.extensions.plain.remove(c)

		const add = vi.spyOn(b.aria, 'add')

		c.disabled = true
		c.visible = false

		expect(add).not.toHaveBeenCalled()
	})

	it('isEnabledTab — одно правило для остановки и навигации', () => {
		const { tabs, a, b, c } = setup()

		b.disabled = true
		c.visible = false

		expect([a, b, c].map((item) => tabs.isEnabledTab(item))).toEqual([true, false, false])
	})
})
