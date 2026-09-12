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
import { h, nextTick } from 'vue'
import { Select } from '@soldy/ui-vue'

/** `TElementPlugin` отдаёт узел через `requestAnimationFrame` — ждём кадр. */
const nextFrame = () => new Promise((resolve) => requestAnimationFrame(resolve))

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

/**
 * Ввод в поле — та же механика, только запрос приходит не из кода, а от
 * пользователя. Разметка в этом не участвует вовсе: `TEditablePlugin` слушает
 * вложенный `<input>` и пишет `filter.query` сам, поэтому во всех адаптерах
 * поведение одно и то же и прокидывать через шаблон нечего.
 */
describe('ввод в поле под отбором', () => {
	/** Набрать текст в поле так, как это делает пользователь. */
	async function type(value: string) {
		const field = wrapper!.find('input')

		;(field.element as HTMLInputElement).value = value
		await field.trigger('input')
		await nextTick()
	}

	it('editableMode: filter — набранное сужает список', async () => {
		const engine = await renderSelect({ editable: true, editableMode: 'filter' })

		await nextFrame()
		await type('тре')

		expect(texts()).toEqual(['Третий'])
		expect(engine.extensions.filter.query).toBe('тре')
		// хранилище не тронуто
		expect(engine.extensions.batch.items.length).toBe(4)
	})

	it('editableMode: search — список остаётся целым', async () => {
		const engine = await renderSelect({ editable: true, editableMode: 'search' })

		await nextFrame()
		await type('тре')

		expect(options().length).toBe(4)
		expect(engine.extensions.filter.query).toBe('')
	})

	it('без editable ввод не слушается вовсе', async () => {
		const engine = await renderSelect({ editableMode: 'filter' })

		await nextFrame()
		await type('тре')

		expect(engine.extensions.filter.query).toBe('')
		expect(options().length).toBe(4)
	})

	/**
	 * Про текст в самом поле после закрытия здесь ничего не проверяется, и это
	 * не упущение: значением `<input>` владеет вложенный `Input` — его
	 * `TInputPlugin` пишет набранное в собственный контрол, и следующий рендер
	 * Input перетирает то, что `TEditablePlugin` положил в DOM напрямую. Дыра
	 * не в отборе и старше его: отбор снимается честно, а вот чем возвращать
	 * поле к тексту выбранного — открытый вопрос.
	 */
	it('закрытие панели снимает отбор', async () => {
		const engine = await renderSelect({
			editable: true,
			editableMode: 'filter',
			value: 'a',
		})

		await nextFrame()
		await type('тре')
		expect(texts()).toEqual(['Третий'])

		await wrapper!.trigger('keydown', { key: 'Escape' })
		await nextTick()

		expect(engine.extensions.filter.query).toBe('')
		expect(texts()).toEqual(['Первый', 'Второй', 'Третий', 'Четвёртый'])
		// выбор фильтр не трогал
		expect(engine.extensions.selection.selectedCount).toBe(1)
	})
})

/**
 * Опции, объявленные разметкой, а не пропом `items` — так их пишут в стенде и
 * так их напишет любой, кому нужен свой вид опции.
 *
 * Случай отдельный, потому что `shown` тут ни при чём: `v-for="item in shown"`
 * в `Select.vue` — это **запасное** содержимое слота, и как только слот задан,
 * состав списка принадлежит разметке. Отбор доезжает до таких опций через их
 * собственный `visible` (`TSelectExtension`), иначе фильтр в стенде просто не
 * виден: движок отбирает, а на экране всё те же три пункта.
 */
describe('опции из разметки под отбором', () => {
	/** Показанные — те, что не скрыты `v-show`. */
	const visibleTexts = () =>
		[...options()]
			.filter((el) => (el as HTMLElement).style.display !== 'none')
			.map((el) => el.textContent?.trim())

	async function renderWithSlot(props: Record<string, unknown> = {}) {
		let engine: any

		wrapper = mount(Select as never, {
			props: {
				'onEngine:create': (value: any) => {
					engine = value
				},
				...props,
			} as never,
			slots: {
				default: () =>
					ITEMS.map((item) => h(Select.Item as never, { key: item.value, ...item })),
			},
			attachTo: document.body,
		})

		await nextTick()
		await nextTick()

		return engine
	}

	it('отбор из кода прячет несовпавшие опции', async () => {
		const engine = await renderWithSlot()

		expect(visibleTexts().length).toBe(4)

		engine.extensions.filter.query = 'вто'
		await nextTick()

		expect(visibleTexts()).toEqual(['Второй'])
		// из коллекции они никуда не делись
		expect(engine.extensions.batch.items.length).toBe(4)
	})

	it('ввод в поле прячет несовпавшие опции', async () => {
		const engine = await renderWithSlot({ editable: true, editableMode: 'filter' })

		await nextFrame()

		const field = wrapper!.find('input')

		;(field.element as HTMLInputElement).value = 'вто'
		await field.trigger('input')
		await nextTick()

		expect(engine.extensions.filter.query).toBe('вто')
		expect(visibleTexts()).toEqual(['Второй'])
	})

	it('снятие отбора возвращает все опции', async () => {
		const engine = await renderWithSlot()

		engine.extensions.filter.query = 'вто'
		await nextTick()
		expect(visibleTexts().length).toBe(1)

		engine.extensions.filter.clear()
		await nextTick()

		expect(visibleTexts()).toEqual(['Первый', 'Второй', 'Третий', 'Четвёртый'])
	})
})
