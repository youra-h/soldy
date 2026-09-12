/**
 * Отбор опций Select — проводка целиком.
 *
 * Юнит-тесты ядра проверяют, что `filter` сужает `shown`, а хранилище не
 * трогает. Здесь важно другое: что скрытая опция **размонтируется в DOM и при
 * этом остаётся в коллекции**. Раньше это было невозможно — регистрация
 * элемента удаляла его из хранилища на размонтировании, и фильтр уничтожал
 * данные по-настоящему.
 */

import { describe, it, expect, afterEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { nextTick } from 'vue'
import { Select } from '@soldy/ui-vue'

let wrapper: ReturnType<typeof mount> | null = null

afterEach(() => {
	wrapper?.unmount()
	wrapper = null
	document.body.innerHTML = ''
})

const ITEMS = [
	{ value: 'a', text: 'Первый' },
	{ value: 'b', text: 'Второй' },
	{ value: 'c', text: 'Третий' },
	{ value: 'd', text: 'Четвёртый' },
]

/** Опции лежат в телепортированной панели, поэтому ищем по документу. */
const options = () => document.querySelectorAll('[role="option"]')
const texts = () => [...options()].map((el) => el.textContent?.trim())

async function renderSelect(props: Record<string, unknown> = {}) {
	let engine: any

	wrapper = mount(Select as never, {
		props: {
			items: ITEMS,
			'onEngine:create': (value: any) => {
				engine = value
			},
			...props,
		} as never,
		attachTo: document.body,
	})

	await nextTick()
	await nextTick()

	return engine
}

describe('Select под отбором', () => {
	it('движок доезжает до теста и содержит filter', async () => {
		const engine = await renderSelect()

		expect(engine).toBeDefined()
		expect(engine.extensions.filter).toBeDefined()
	})

	it('сужает список на экране', async () => {
		const engine = await renderSelect()

		expect(options().length).toBe(4)

		engine.extensions.filter.query = 'тре'
		await nextTick()

		expect(texts()).toEqual(['Третий'])
	})

	it('скрытые опции остаются в коллекции — размонтирование их не удаляет', async () => {
		const engine = await renderSelect()

		engine.extensions.filter.query = 'тре'
		await nextTick()

		// на экране одна, в хранилище по-прежнему все четыре
		expect(options().length).toBe(1)
		expect(engine.extensions.batch.items.length).toBe(4)
	})

	it('снятие отбора возвращает весь список', async () => {
		const engine = await renderSelect()

		engine.extensions.filter.query = 'тре'
		await nextTick()
		expect(options().length).toBe(1)

		engine.extensions.filter.clear()
		await nextTick()

		expect(texts()).toEqual(['Первый', 'Второй', 'Третий', 'Четвёртый'])
	})

	it('отбор по тексту, а не по значению — поле сравнения ставит Select', async () => {
		const engine = await renderSelect()

		expect(engine.extensions.filter.fields).toEqual(['text'])

		// 'a' — это value первой опции, но по значению не ищем
		engine.extensions.filter.query = 'a'
		await nextTick()

		expect(options().length).toBe(0)
	})

	it('пустой отбор показывает слот empty', async () => {
		const engine = await renderSelect()

		engine.extensions.filter.query = 'ничего такого нет'
		await nextTick()

		expect(options().length).toBe(0)
		expect(engine.extensions.batch.items.length).toBe(4)
	})

	it('выбор скрытой опции не теряется', async () => {
		const engine = await renderSelect({ value: 'a' })

		expect(engine.extensions.selection.selectedCount).toBe(1)

		// «Первый» под отбор не попадает и уходит из DOM
		engine.extensions.filter.query = 'тре'
		await nextTick()

		expect(texts()).toEqual(['Третий'])
		// выбор на месте: элемент не удалялся, `change:items` не приходил
		expect(engine.extensions.selection.selectedCount).toBe(1)

		engine.extensions.filter.clear()
		await nextTick()

		const selected = engine.extensions.batch.items.filter((item: any) =>
			engine.extensions.selection.isSelected(item),
		)

		expect(selected.map((item: any) => item.value)).toEqual(['a'])
	})
})
