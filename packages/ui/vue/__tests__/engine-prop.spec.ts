/**
 * Коллекция, переданная пропом `:engine`.
 *
 * Аналог `ctrl` для компонента: движок собирается снаружи и отдаётся готовым.
 * Раньше единственным способом дотянуться до него было событие
 * `@engine:create` — ссылка приходила отложенно и до первого рендера её не
 * существовало.
 *
 * Проверяется проводка целиком: пропом задали — компонент нарисовал, и связь
 * двусторонняя. Юнит-тесты ядра проверяют сборку и догон
 * (`core/__tests__/engine-create.spec.ts`), здесь важно, что проп доезжает.
 */

import { describe, it, expect, afterEach, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { nextTick } from 'vue'
import { createEngine, createEngineActivation } from '@soldy/core'
import { ListBox, Select, Tabs, Accordion } from '@soldy/ui-vue'

let wrapper: ReturnType<typeof mount> | null = null

afterEach(() => {
	wrapper?.unmount()
	wrapper = null
	document.body.innerHTML = ''
	vi.restoreAllMocks()
})

const ITEMS = [
	{ value: 'a', text: 'Первый' },
	{ value: 'b', text: 'Второй' },
]

/** Элементы рисуются владельцем, когда состав пришёл коллекцией, а не слотами. */
const ITEM_SELECTOR: Record<string, string> = {
	ListBox: '.s-list-box-item',
	Tabs: '.s-tabs-item',
	Accordion: '.s-accordion-item',
}

describe.each([
	['ListBox', ListBox],
	['Tabs', Tabs],
	['Accordion', Accordion],
] as const)('%s принимает готовую коллекцию', (name, Component) => {
	it('рисует элементы движка уровня 1', async () => {
		const engine = createEngine({ items: ITEMS })

		wrapper = mount(Component as never, {
			props: { engine } as never,
			attachTo: document.body,
		})

		await nextTick()

		expect(wrapper.findAll(ITEM_SELECTOR[name]).length).toBe(2)
	})

	/**
	 * Двусторонность: движок остаётся источником истины, и правка через него
	 * видна в разметке. Иначе проп был бы разовым снимком, а не связью.
	 */
	it('добавление в движок доезжает до разметки', async () => {
		const engine = createEngine({ items: ITEMS })

		wrapper = mount(Component as never, {
			props: { engine } as never,
			attachTo: document.body,
		})

		await nextTick()

		engine.extensions.batch.set([{ value: 'c', text: 'Третий' }])
		await nextTick()

		expect(wrapper.findAll(ITEM_SELECTOR[name]).length).toBe(3)
	})
})

describe('Select принимает готовую коллекцию', () => {
	/** Опции Select лежат в телепортированной панели, поэтому ищем по документу. */
	it('рисует опции движка уровня 1', async () => {
		const engine = createEngine({ items: ITEMS })

		wrapper = mount(Select as never, {
			props: { engine } as never,
			attachTo: document.body,
		})

		await nextTick()

		expect(document.querySelectorAll('[role="option"]').length).toBe(2)
	})
})

describe('уровень движка компоненту не важен', () => {
	/**
	 * Tabs нужен `activation`, но требовать его от того, кто собирал коллекцию,
	 * нельзя: смысл уровней в том, что заранее знать компонент не обязательно.
	 */
	it('Tabs доустанавливает недостающее сам', async () => {
		const bare = createEngine({ items: ITEMS })

		expect(bare.extensions.activation).toBeUndefined()

		wrapper = mount(Tabs as never, { props: { engine: bare } as never, attachTo: document.body })
		await nextTick()

		expect(bare.extensions.activation).toBeDefined()
		expect(bare.extensions.tabs).toBeDefined()
	})

	it('движок нужного уровня принимается как есть', async () => {
		const ready = createEngineActivation({ items: ITEMS })
		const activation = ready.extensions.activation

		wrapper = mount(Tabs as never, { props: { engine: ready } as never, attachTo: document.body })
		await nextTick()

		// Не пересоздано: своё расширение осталось тем же объектом
		expect(ready.extensions.activation).toBe(activation)
	})
})
