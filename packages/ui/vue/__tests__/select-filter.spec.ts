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
import { Select } from '@soldy-ui/vue'
import type { TCollectionEngine } from '@soldy-ui/core'

/** Движок, который коллекция отдаёт через `engine:create`: элементы с `value`. */
type TEngine = TCollectionEngine<{ readonly value: unknown }, any>

/** `TElementPlugin` отдаёт узел через `requestAnimationFrame` — ждём кадр. */
const nextFrame = () => new Promise((resolve) => requestAnimationFrame(resolve))

type TWrapper = ReturnType<typeof mount>

let wrapper: TWrapper | null = null

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

async function renderSelect(
	props: Record<string, unknown> = {},
): Promise<{ wrapper: TWrapper; engine: TEngine }> {
	let engine: TEngine | undefined

	const mounted = mount(Select, {
		props: {
			items: ITEMS,
			'onEngine:create': (value: TEngine) => {
				engine = value
			},
			...props,
		},
		attachTo: document.body,
	})

	// модульная ссылка — только для размонтирования в afterEach
	wrapper = mounted

	await nextTick()
	await nextTick()

	if (!engine) throw new Error('engine:create не пришёл')

	return { wrapper: mounted, engine }
}

describe('Select под отбором', () => {
	it('движок доезжает до теста и содержит filter', async () => {
		const { engine } = await renderSelect()

		expect(engine).toBeDefined()
		expect(engine.extensions.filter).toBeDefined()
	})

	it('сужает список на экране', async () => {
		const { engine } = await renderSelect()

		expect(options().length).toBe(4)

		engine.extensions.filter.query = 'тре'
		await nextTick()

		expect(texts()).toEqual(['Третий'])
	})

	it('скрытые опции остаются в коллекции — размонтирование их не удаляет', async () => {
		const { engine } = await renderSelect()

		engine.extensions.filter.query = 'тре'
		await nextTick()

		// на экране одна, в хранилище по-прежнему все четыре
		expect(options().length).toBe(1)
		expect(engine.extensions.batch.items.length).toBe(4)
	})

	it('снятие отбора возвращает весь список', async () => {
		const { engine } = await renderSelect()

		engine.extensions.filter.query = 'тре'
		await nextTick()
		expect(options().length).toBe(1)

		engine.extensions.filter.clear()
		await nextTick()

		expect(texts()).toEqual(['Первый', 'Второй', 'Третий', 'Четвёртый'])
	})

	it('отбор по тексту, а не по значению — поле сравнения ставит Select', async () => {
		const { engine } = await renderSelect()

		expect(engine.extensions.filter.fields).toEqual(['text'])

		// 'a' — это value первой опции, но по значению не ищем
		engine.extensions.filter.query = 'a'
		await nextTick()

		expect(options().length).toBe(0)
	})

	it('пустой отбор показывает слот empty', async () => {
		const { engine } = await renderSelect()

		engine.extensions.filter.query = 'ничего такого нет'
		await nextTick()

		expect(options().length).toBe(0)
		expect(engine.extensions.batch.items.length).toBe(4)
	})

	it('выбор скрытой опции не теряется', async () => {
		const { engine } = await renderSelect({ value: 'a' })

		expect(engine.extensions.selection.selectedCount).toBe(1)

		// «Первый» под отбор не попадает и уходит из DOM
		engine.extensions.filter.query = 'тре'
		await nextTick()

		expect(texts()).toEqual(['Третий'])
		// выбор на месте: элемент не удалялся, `change:items` не приходил
		expect(engine.extensions.selection.selectedCount).toBe(1)

		engine.extensions.filter.clear()
		await nextTick()

		const selected = engine.extensions.batch.items.filter((item: { readonly value: unknown }) =>
			engine.extensions.selection.isSelected(item),
		)

		expect(selected.map((item: { readonly value: unknown }) => item.value)).toEqual(['a'])
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
	async function type(select: TWrapper, value: string) {
		const field = select.find('input')

		;(field.element as HTMLInputElement).value = value
		await field.trigger('input')
		await nextTick()
	}

	it('editableMode: filter — набранное сужает список', async () => {
		const { wrapper, engine } = await renderSelect({ editable: true, editableMode: 'filter' })

		await nextFrame()
		await type(wrapper, 'тре')

		expect(texts()).toEqual(['Третий'])
		expect(engine.extensions.filter.query).toBe('тре')
		// хранилище не тронуто
		expect(engine.extensions.batch.items.length).toBe(4)
	})

	it('editableMode: search — список остаётся целым', async () => {
		const { wrapper, engine } = await renderSelect({ editable: true, editableMode: 'search' })

		await nextFrame()
		await type(wrapper, 'тре')

		expect(options().length).toBe(4)
		expect(engine.extensions.filter.query).toBe('')
	})

	it('без editable ввод не слушается вовсе', async () => {
		const { wrapper, engine } = await renderSelect({ editableMode: 'filter' })

		await nextFrame()
		await type(wrapper, 'тре')

		expect(engine.extensions.filter.query).toBe('')
		expect(options().length).toBe(4)
	})

	/**
	 * Двойной Escape: первый закрывает панель и набранное не трогает — второй,
	 * уже на закрытой панели, возвращает поле (снимает отбор, пишет текст
	 * выбранного в `owner.field.value`). Поле — отдельный экземпляр `TInput`
	 * (`field`), которым владеет Select и который вложенный `Input` получает
	 * через `:ctrl`, поэтому запись реально меняет значение и `<input>`
	 * перерисовывается сам — раньше на этом месте была прямая запись в DOM,
	 * которую перетирал ближайший рендер `Input`.
	 */
	it('первый Escape закрывает панель и не трогает отбор, второй — снимает и возвращает текст', async () => {
		const { wrapper, engine } = await renderSelect({
			editable: true,
			editableMode: 'filter',
			value: 'a',
		})

		await nextFrame()
		await type(wrapper, 'тре')
		expect(texts()).toEqual(['Третий'])

		await wrapper.find('input').trigger('keydown', { key: 'Escape' })
		await nextTick()

		expect(engine.extensions.filter.query).toBe('тре')
		expect(texts()).toEqual(['Третий'])
		expect((wrapper.find('input').element as HTMLInputElement).value).toBe('тре')

		await wrapper.find('input').trigger('keydown', { key: 'Escape' })
		await nextTick()

		expect(engine.extensions.filter.query).toBe('')
		expect(texts()).toEqual(['Первый', 'Второй', 'Третий', 'Четвёртый'])
		// выбор фильтр не трогал
		expect(engine.extensions.selection.selectedCount).toBe(1)
		expect((wrapper.find('input').element as HTMLInputElement).value).toBe('Первый')
	})

	/**
	 * Баг из ленты задачи: `single`, набранный текст ни с чем не совпадает,
	 * двойной Escape возвращает поле пустым, но следующий рендер (стрелка вниз
	 * открывает панель) возвращал набранное обратно — второй копией владел
	 * вложенный `Input`. Теперь копия одна (`field`), и лишнему рендеру
	 * неоткуда взять старый текст.
	 */
	it('несовпавший текст, Esc, Esc, ↓ — поле остаётся пустым', async () => {
		const { wrapper } = await renderSelect({ editable: true })

		await nextFrame()
		await type(wrapper, 'несуществующий текст')

		await wrapper.find('input').trigger('keydown', { key: 'Escape' })
		await nextTick()
		await wrapper.find('input').trigger('keydown', { key: 'Escape' })
		await nextTick()

		expect((wrapper.find('input').element as HTMLInputElement).value).toBe('')

		await wrapper.find('input').trigger('keydown', { key: 'ArrowDown' })
		await nextTick()

		expect((wrapper.find('input').element as HTMLInputElement).value).toBe('')
	})

	/**
	 * Баг из ленты задачи: `multiple`, выбор по Enter добавляет тег, но текст
	 * («Пер») оставался в поле и после перерисовки (открылась панель, появился
	 * тег) — снова две копии значения. `TSelectExtension` чистит поле на
	 * выбор пользователя (`chooseItem`) сама, независимо от `editableMode`.
	 */
	it('multiple: Enter добавляет тег и очищает поле, включая перерисовку', async () => {
		const { wrapper } = await renderSelect({ editable: true, mode: 'multiple' })

		await nextFrame()
		await type(wrapper, 'Пер')
		await nextTick()

		await wrapper.find('input').trigger('keydown', { key: 'Enter' })
		await nextTick()
		await nextTick()

		expect((wrapper.find('input').element as HTMLInputElement).value).toBe('')
		expect(wrapper.findAll('.s-tags-item').length).toBe(1)
	})

	/**
	 * `single`: набрали текст заново поверх уже выбранной опции и нажали
	 * Enter на той же, подсвеченной, опции — выбор фактически не меняется, но
	 * поле обязано вернуться к тексту выбранного, а не остаться с набранным.
	 */
	it('single: Enter на уже выбранной опции возвращает её текст в поле', async () => {
		const { wrapper, engine } = await renderSelect({ editable: true, value: 'c' })

		await nextFrame()
		expect((wrapper.find('input').element as HTMLInputElement).value).toBe('Третий')

		await type(wrapper, 'Тре')
		await wrapper.find('input').trigger('keydown', { key: 'Enter' })
		await nextTick()

		expect(engine.extensions.selection.selectedCount).toBe(1)
		expect((wrapper.find('input').element as HTMLInputElement).value).toBe('Третий')
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
	/** Показанные — те, что не скрыты `v-show`: он стоит на корне элемента, не на строке. */
	const visibleTexts = () =>
		[...document.querySelectorAll<HTMLElement>('.s-select-item')]
			.filter((el) => el.style.display !== 'none')
			.map((el) => el.textContent?.trim())

	async function renderWithSlot(
		props: Record<string, unknown> = {},
	): Promise<{ wrapper: TWrapper; engine: TEngine }> {
		let engine: TEngine | undefined

		const mounted = mount(Select, {
			props: {
				'onEngine:create': (value: TEngine) => {
					engine = value
				},
				...props,
			},
			slots: {
				default: () => ITEMS.map((item) => h(Select.Item, { key: item.value, ...item })),
			},
			attachTo: document.body,
		})

		wrapper = mounted

		await nextTick()
		await nextTick()

		if (!engine) throw new Error('engine:create не пришёл')

		return { wrapper: mounted, engine }
	}

	it('отбор из кода прячет несовпавшие опции', async () => {
		const { engine } = await renderWithSlot()

		expect(visibleTexts().length).toBe(4)

		engine.extensions.filter.query = 'вто'
		await nextTick()

		expect(visibleTexts()).toEqual(['Второй'])
		// из коллекции они никуда не делись
		expect(engine.extensions.batch.items.length).toBe(4)
	})

	it('ввод в поле прячет несовпавшие опции', async () => {
		const { wrapper, engine } = await renderWithSlot({ editable: true, editableMode: 'filter' })

		await nextFrame()

		const field = wrapper.find('input')

		;(field.element as HTMLInputElement).value = 'вто'
		await field.trigger('input')
		await nextTick()

		expect(engine.extensions.filter.query).toBe('вто')
		expect(visibleTexts()).toEqual(['Второй'])
	})

	it('снятие отбора возвращает все опции', async () => {
		const { engine } = await renderWithSlot()

		engine.extensions.filter.query = 'вто'
		await nextTick()
		expect(visibleTexts().length).toBe(1)

		engine.extensions.filter.clear()
		await nextTick()

		expect(visibleTexts()).toEqual(['Первый', 'Второй', 'Третий', 'Четвёртый'])
	})
})
