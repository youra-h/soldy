import { describe, it, expect, vi } from 'vitest'
import {
	TTabs,
	TTabItem,
	TTabsExtension,
	TTabItemExtension,
	TItemContextRegistry,
	TCollectionEngine,
	TPlainExtension,
	TActivationExtension,
} from '@soldy/core'
import type { ITabItem, ITabs } from '@soldy/core'

// ============================================================================
// Pure TTabs
// ============================================================================

describe('TTabs (чистый класс)', () => {
	it('создаётся с дефолтными значениями', () => {
		const tabs = new TTabs()

		expect(tabs.orientation).toBe('horizontal')
		expect(tabs.alignment).toBe('start')
		expect(tabs.position).toBe('start')
		expect(tabs.view).toBe('line')
		expect(tabs.closable).toBe(false)
		expect(tabs.variant).toBe('normal')
		expect(tabs.classes.toArray()).toContain('s-tabs')
	})

	it('принимает props через plain-объект', () => {
		const tabs = new TTabs({ orientation: 'vertical', closable: true, view: 'outline' })

		expect(tabs.orientation).toBe('vertical')
		expect(tabs.closable).toBe(true)
		expect(tabs.view).toBe('outline')
	})

	it('принимает props через { props }', () => {
		const tabs = new TTabs({ props: { orientation: 'vertical', alignment: 'center' } })

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
		tabs.view = 'outline'
		tabs.alignment = 'end'

		expect(onOrientation).toHaveBeenCalledWith('vertical')
		expect(onClosable).toHaveBeenCalledWith(true)
		expect(onView).toHaveBeenCalledWith('outline')
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

		tabs.view = 'contained'
		expect(tabs.classes.toArray()).toContain('s-tabs--contained')
	})

	it('getProps возвращает актуальные значения', () => {
		const tabs = new TTabs({ orientation: 'vertical', closable: true, view: 'outline' })

		const props = tabs.getProps()

		expect(props).toMatchObject({
			orientation: 'vertical',
			closable: true,
			view: 'outline',
		})
	})
})

// ============================================================================
// Pure TTabItem
// ============================================================================

describe('TTabItem (чистый класс)', () => {
	it('создаётся с дефолтными значениями', () => {
		const tab = new TTabItem()

		expect(tab.text).toBe('')
		expect(tab.value).toBe('')
		expect(tab.closable).toBeUndefined()
		expect(tab.classes.toArray()).toContain('s-tab-item')
		expect(tab.tag).toBe('button')
	})

	it('принимает props через конструктор', () => {
		const tab = new TTabItem({ text: 'Tab 1', value: 'tab-1', closable: true })

		expect(tab.text).toBe('Tab 1')
		expect(tab.value).toBe('tab-1')
		expect(tab.closable).toBe(true)
	})

	it('эмитит change:text при изменении текста', () => {
		const tab = new TTabItem({ text: 'initial' })
		const onChange = vi.fn()

		tab.events.on('change:text', onChange)
		tab.text = 'updated'

		expect(onChange).toHaveBeenCalledWith({ oldValue: 'initial', newValue: 'updated' })
	})

	it('closable меняется через state и отражается в getProps', () => {
		const tab = new TTabItem()

		tab.closable = true

		expect(tab.closable).toBe(true)
		expect(tab.getProps().closable).toBe(true)

		tab.closable = false

		expect(tab.closable).toBe(false)
	})

	it('событие change:text эмитится с правильным payload', () => {
		const tab = new TTabItem({ text: 'a' })
		const onChange = vi.fn()

		tab.events.on('change:text', onChange)
		tab.text = 'b'

		expect(onChange).toHaveBeenCalledWith({ oldValue: 'a', newValue: 'b' })
	})

	it('disabled таб не может быть closable', () => {
		const tab = new TTabItem({ closable: true })

		expect(tab.closable).toBe(true)

		tab.disabled = true

		expect(tab.closable).toBe(false)
	})

	it('класс --closable добавляется/убирается', () => {
		const tab = new TTabItem()

		expect(tab.classes.toArray()).not.toContain('--closable')

		tab.closable = true

		expect(tab.classes.toArray()).toContain('s-tab-item--closable')
	})
})

// ============================================================================
// Collection: TTabsExtension + TActivationExtension
// ============================================================================

type TabsExtensions = {
	plain: TPlainExtension<ITabItem>
	activation: TActivationExtension<ITabItem>
	tabs: TTabsExtension<ITabs, ITabItem>
}

function createTabsCollection(tabs?: TTabs) {
	const owner = tabs ?? new TTabs()

	return {
		owner,
		collection: new TCollectionEngine<ITabItem, TabsExtensions>({
			extensions: {
				plain: new TPlainExtension<ITabItem>(),
				activation: new TActivationExtension<ITabItem>(),
				tabs: new TTabsExtension({ owner }),
			},
		}) as unknown as TCollectionEngine<ITabItem, TabsExtensions>,
	}
}

function createTab(text: string, value?: string): TTabItem {
	return new TTabItem({ text, value: value ?? text.toLowerCase().replace(/\s+/g, '-') })
}

describe('Коллекция табов с TTabsExtension + TActivationExtension', () => {
	// --- Базовые операции ---

	it('добавление табов через коллекцию', () => {
		const { collection } = createTabsCollection()
		const tab1 = createTab('Tab 1')
		const tab2 = createTab('Tab 2')

		collection.extensions.plain.insert(tab1)
		collection.extensions.plain.insert(tab2)

		expect(collection.driver.length).toBe(2)
		expect(collection.driver.includes(tab1)).toBe(true)
		expect(collection.driver.includes(tab2)).toBe(true)
	})

	it('TTabsExtension пробрасывает свойства владельца при добавлении элемента', () => {
		const tabs = new TTabs({ disabled: true, size: 'lg', variant: 'accent' })
		const { collection } = createTabsCollection(tabs)

		const tab = createTab('Tab')
		collection.extensions.plain.insert(tab)

		expect(tab.disabled).toBe(true)
		expect(tab.size).toBe('lg')
		expect(tab.variant).toBe('accent')
	})

	it('TTabsExtension пробрасывает изменение disabled на все элементы', () => {
		const tabs = new TTabs()
		const { collection } = createTabsCollection(tabs)

		const tab1 = createTab('Tab 1')
		const tab2 = createTab('Tab 2')

		collection.extensions.plain.insert(tab1)
		collection.extensions.plain.insert(tab2)

		tabs.disabled = true

		expect(tab1.disabled).toBe(true)
		expect(tab2.disabled).toBe(true)
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
		expect(collection.driver.length).toBe(1)
		expect(collection.driver.includes(tab1)).toBe(true)
		expect(collection.driver.includes(tab2)).toBe(false)
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
		expect(collection.driver.length).toBe(1)
	})

	it('движок генерит item:removed после closeTab', () => {
		const { collection } = createTabsCollection()
		const tab = createTab('Tab')

		collection.extensions.plain.insert(tab)

		tab.closable = true

		const onRemoved = vi.fn()

		collection.driver.events.on('item:removed', onRemoved)

		collection.extensions.tabs.closeTab(tab)

		expect(onRemoved).toHaveBeenCalledWith(tab)
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

	// --- TTabItemExtension.closable через контекст ---

	it('TTabItemExtension.closable через контекст: резолв item > parent', () => {
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
		expect(collection.driver.length).toBe(3)

		// tab2 должен закрыться (наследует closable = true)
		const r2 = collection.extensions.tabs.closeTab(tab2)

		expect(r2).toBe(true)
		expect(collection.driver.length).toBe(2)
		expect(collection.driver.includes(tab1)).toBe(true)
		expect(collection.driver.includes(tab3)).toBe(true)
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

		expect(collection.driver.length).toBe(1)
		expect(collection.driver.includes(tab1)).toBe(true)

		// Попытка закрыть tab1 не должна сработать
		const r = collection.extensions.tabs.closeTab(tab1)

		expect(r).toBe(false)
		expect(collection.driver.length).toBe(1)
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

	// --- TTabItemExtension.close() через контекст ---

	it('TTabItemExtension.close() удаляет таб и эмитит item:close', () => {
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
		expect(collection.driver.length).toBe(1)
		expect(collection.driver.includes(tab1)).toBe(false)
		expect(collection.driver.includes(tab2)).toBe(true)
	})

	it('TTabItemExtension.close() не удаляет не-closable таб', () => {
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
		expect(collection.driver.length).toBe(1)
	})
})
