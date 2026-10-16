/**
 * Toasts во Vue — проводка целиком, на настоящей разметке.
 *
 * Очередь, предел видимых и закрытие проверяет ядро
 * (`core/__tests__/toasts.spec.ts`), отсчёт, удаление, клавиши и жест — плагины;
 * здесь важно, что они сходятся: менеджер оборачивает приложение и отдаёт API
 * тостов лифтом, регион телепортирован и стоит пустым, тосты рисуются по
 * показанным, слоты пробрасываются, своё содержимое получает тост и закрывает
 * его, а закрытый тост уходит из разметки.
 *
 * Раскладку, переходы темы и настоящий указатель jsdom не выполняет — место,
 * стопка, уход и жест мышью — `playground/vue/browser/toasts.spec.ts`.
 */

import { describe, it, expect, afterEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { defineComponent, h, nextTick, type VNode } from 'vue'
import { createEngineTags, createEngineToasts } from '@soldy-ui/core'
import type { IToastsItem, IToastsProps } from '@soldy-ui/core'
import { ruRU } from '@soldy-ui/plugins'
import { LocaleProvider, Tags, Toasts, useToasts } from '@soldy-ui/vue'
import type { TToastRender } from '@soldy-ui/vue'

const nextFrame = () => new Promise((resolve) => requestAnimationFrame(resolve))

let wrapper: ReturnType<typeof mount> | null = null

afterEach(() => {
	wrapper?.unmount()
	wrapper = null
	document.body.innerHTML = ''
})

/** Узел по селектору; нет его — тест падает здесь, а не на чтении свойства. */
function find(selector: string, scope: ParentNode = document): HTMLElement {
	const element = scope.querySelector(selector)

	if (!(element instanceof HTMLElement)) throw new Error(`${selector}: HTML-узла нет`)

	return element
}

const region = () => find('.so-toasts')
const toasts = () => [...document.querySelectorAll<HTMLElement>('.so-toasts-item')]
const texts = () => toasts().map((toast) => find('.so-toasts-item__text', toast).textContent)

/** API, которое взял потомок менеджера: его `setup()` зовёт `useToasts()`. */
type TApi = ReturnType<typeof useToasts>

/**
 * Приложение под менеджером: потомок берёт API тостов и отдаёт его тесту.
 * Слоты менеджера — `slots`.
 */
function render(
	props: Partial<IToastsProps> & Record<string, unknown> = {},
	slots: Record<string, (scope: { item: IToastsItem; text?: string }) => VNode | VNode[]> = {},
): TApi {
	let api: TApi | null = null

	const App = defineComponent({
		setup() {
			api = useToasts()

			return () => h('main', { class: 'so-test-app' }, 'Приложение')
		},
	})

	wrapper = mount(
		defineComponent({
			render: () => h(Toasts, props, { default: () => h(App), ...slots }),
		}),
		{ attachTo: document.body },
	)

	if (!api) throw new Error('useToasts() не позвали')

	return api
}

describe('Toasts · менеджер и API', () => {
	it('приложение рисуется в слоте, регион — телепортом в body и пустым', () => {
		render()

		expect(find('.so-test-app').textContent).toBe('Приложение')
		expect(region().parentElement).toBe(document.body)
		expect(toasts()).toEqual([])
	})

	it('useToasts() в потомке: show рисует тост, новый — первым', async () => {
		const { show } = render()

		show('Сохранено')
		show({ text: 'Отправлено', description: 'Письмо ушло' })
		await nextTick()

		expect(texts()).toEqual(['Отправлено', 'Сохранено'])
		expect(find('.so-toasts-item__description', toasts()[0]).textContent).toBe('Письмо ушло')
	})

	it('useToasts() без менеджера выше — ошибка', () => {
		const Orphan = defineComponent({
			setup() {
				useToasts()

				return () => null
			},
		})

		expect(() => mount(Orphan)).toThrow(/<Toasts>/)
	})

	it('предел видимых: показаны первые max, остальные ждут', async () => {
		const { show } = render({ max: 2 })

		show('Первый')
		show('Второй')
		show('Третий')
		await nextTick()

		expect(texts()).toEqual(['Третий', 'Второй'])
	})

	it('приложение рисуется и без региона', async () => {
		const { show } = render({ rendered: false })

		show('Сохранено')
		await nextTick()

		expect(find('.so-test-app').textContent).toBe('Приложение')
		expect(document.querySelector('.so-toasts')).toBeNull()
	})
})

describe('Toasts · стопка', () => {
	/** Глубина каждого тоста — переменная, которую разметка отдаёт теме. */
	const depths = () => toasts().map((toast) => toast.style.getPropertyValue('--so-toasts-depth'))

	it('раскладка — модификатор региона: столбец по умолчанию, стопка по пропу', () => {
		render()

		expect(region().classList.contains('so-toasts--layout-list')).toBe(true)

		wrapper?.unmount()
		document.body.innerHTML = ''
		render({ layout: 'cascade' })

		expect(region().classList.contains('so-toasts--layout-cascade')).toBe(true)
		expect(region().classList.contains('so-toasts--layout-list')).toBe(false)
	})

	it('глубина — место в составе; перестановка меняет и порядок узлов, и глубину', async () => {
		const engine = createEngineToasts()
		const { show } = render({ engine, layout: 'cascade' })

		const oldest = show('Первый')

		show('Второй')
		show('Третий')
		await nextTick()

		expect(texts()).toEqual(['Третий', 'Второй', 'Первый'])
		expect(depths()).toEqual(['0', '1', '2'])

		if (!oldest) throw new Error('тоста нет')

		engine.extensions.plain.move(oldest, 0)
		await nextTick()

		expect(texts()).toEqual(['Первый', 'Третий', 'Второй'])
		expect(depths()).toEqual(['0', '1', '2'])
	})

	it('колесо над стопкой листает её: передний уходит назад', async () => {
		const { show } = render({ layout: 'cascade' })

		show('Первый')
		show('Второй')
		await nextTick()
		// Слушатели стопки встают на регион с его узлом — кадром позже
		await nextFrame()

		const event = new WheelEvent('wheel', { deltaY: 100, bubbles: true, cancelable: true })

		toasts()[0]?.dispatchEvent(event)
		await nextTick()

		expect(event.defaultPrevented).toBe(true)
		expect(texts()).toEqual(['Первый', 'Второй'])
	})
})

/**
 * Менеджер оборачивает приложение, и его коллекция — ближайшая выше почти
 * везде в дереве. Элемент коллекции входит только в коллекцию своего типа:
 * тег вне своего набора (чип) под менеджером рисуется сам по себе, а не
 * становится тостом и не роняет сборку приложения.
 */
describe('Toasts · элемент чужой коллекции под менеджером', () => {
	/** Менеджер над своим движком, а под ним — содержимое приложения. */
	function renderUnder(content: () => VNode) {
		const engine = createEngineToasts()

		wrapper = mount(defineComponent({ render: () => h(Toasts, { engine }, content) }), {
			attachTo: document.body,
		})

		return engine
	}

	it('тег вне Tags рисуется сам по себе, тостом не становится', async () => {
		const engine = renderUnder(() => h(Tags.Item, { value: 'a', text: 'Тег' }))

		await nextTick()

		expect(find('.so-tags-item').textContent).toContain('Тег')
		expect(engine.extensions.batch.items).toEqual([])
		expect(toasts()).toEqual([])
	})

	it('тег в своём Tags под менеджером входит в Tags', async () => {
		const tags = createEngineTags()
		const engine = renderUnder(() =>
			h(Tags, { engine: tags }, () => h(Tags.Item, { value: 'a', text: 'Тег' })),
		)

		await nextTick()

		expect(tags.extensions.batch.items.map((item) => item.value)).toEqual(['a'])
		expect(engine.extensions.batch.items).toEqual([])
		expect(toasts()).toEqual([])
	})
})

describe('Toasts · движок снаружи', () => {
	it('тосты, показанные до монтирования, рисуются', async () => {
		const engine = createEngineToasts()

		engine.extensions.toasts.show('До монтирования')

		render({ engine })
		await nextTick()

		expect(texts()).toEqual(['До монтирования'])
	})

	it('код вне компонентов показывает тост тем же API после монтирования', async () => {
		const engine = createEngineToasts()
		const api = render({ engine })

		expect(api.show).toBe(engine.extensions.toasts.show)

		engine.extensions.toasts.show('Из кода')
		await nextTick()

		expect(texts()).toEqual(['Из кода'])
	})
})

describe('Toasts · закрытие', () => {
	it('крестик закрывает тост: data-open="false", а после переходов он уходит', async () => {
		const { show } = render()
		const toast = show('Сохранено')

		await nextTick()

		find('.so-toasts-item__close').click()
		await nextTick()

		expect(toast?.open).toBe(false)
		expect(toasts()[0]?.dataset.open).toBe('false')

		// Переходов в jsdom нет — тост уходит тем же кадром
		await nextFrame()
		await nextTick()

		expect(toasts()).toEqual([])
	})

	it('закрытие из кода — тот же путь', async () => {
		const { show } = render()
		const toast = show('Сохранено')

		await nextTick()

		toast?.close()
		await nextFrame()
		await nextTick()

		expect(toasts()).toEqual([])
	})

	it('без крестика: closable: false', async () => {
		const { show } = render()

		show({ text: 'Важно', closable: false })
		await nextTick()

		expect(toasts()[0]?.querySelector('.so-toasts-item__close')).toBeNull()
	})
})

describe('Toasts · своё содержимое (render)', () => {
	it('компонент получает тост пропом toast, и кнопка внутри закрывает его', async () => {
		const Undo: TToastRender = ({ toast }) =>
			h('button', { class: 'so-test-undo', onClick: () => toast.close() }, 'Отменить')
		const { show } = render()
		const toast = show({ text: 'Удалено', render: Undo })

		await nextTick()

		const undo = find('.so-toasts-item__content .so-test-undo')

		expect(undo.textContent).toBe('Отменить')

		undo.click()
		await nextTick()

		expect(toast?.open).toBe(false)
	})

	it('компонент с объявленным пропом — тоже содержимое', async () => {
		const received: unknown[] = []
		const Note = defineComponent(
			(props: { toast: IToastsItem }) => {
				received.push(props.toast)

				return () => h('em', { class: 'so-test-note' }, 'Готово')
			},
			{ props: ['toast'] },
		)
		const { show } = render()
		const toast = show({ text: 'Готово', render: Note })

		await nextTick()

		expect(find('.so-test-note').textContent).toBe('Готово')
		expect(received).toEqual([toast])
	})

	it('без render часть содержимого пуста', async () => {
		const { show } = render()

		show('Сохранено')
		await nextTick()

		expect(find('.so-toasts-item__content').children).toHaveLength(0)
	})
})

describe('Toasts · слоты', () => {
	it('item — текст со scope { item, text }, item-content — своё содержимое', async () => {
		const { show } = render(
			{},
			{
				item: ({ item, text }) =>
					h('strong', { class: 'so-test-text', 'data-uid': item.uid }, `${text}!`),
				'item-content': ({ item }) => h('span', { class: 'so-test-content' }, item.text),
			},
		)

		show('Сохранено')
		await nextTick()

		expect(find('.so-test-text').textContent).toBe('Сохранено!')
		expect(find('.so-toasts-item__content .so-test-content').textContent).toBe('Сохранено')
	})

	it('item-icon — значок; без слота узла значка нет', async () => {
		const { show } = render()

		show('Без значка')
		await nextTick()

		expect(document.querySelector('.so-toasts-item__icon')).toBeNull()

		wrapper?.unmount()
		document.body.innerHTML = ''

		const api = render({}, { 'item-icon': () => h('svg', { class: 'so-test-icon' }) })

		api.show('Со значком')
		await nextTick()

		const icon = find('.so-toasts-item__icon')

		expect(icon.getAttribute('aria-hidden')).toBe('true')
		expect(icon.querySelector('.so-test-icon')).not.toBeNull()
	})

	it('item-close-icon подменяет иконку крестика', async () => {
		const { show } = render({}, { 'item-close-icon': () => h('i', { class: 'so-test-x' }) })

		show('Сохранено')
		await nextTick()

		expect(find('.so-toasts-item__close .so-test-x')).toBeTruthy()
	})
})

describe('Toasts · ARIA', () => {
	it('регион — region с живой областью и именем от локали', async () => {
		wrapper = mount(
			defineComponent({
				render: () =>
					h(LocaleProvider, { locale: ruRU }, () =>
						h(Toasts, null, () => h('main', 'Приложение')),
					),
			}),
			{ attachTo: document.body },
		)
		await nextTick()

		expect(region().getAttribute('role')).toBe('region')
		expect(region().getAttribute('aria-live')).toBe('polite')
		expect(region().getAttribute('aria-label')).toBe('Уведомления (F8)')
		expect(region().dataset.layer).toBeDefined()
	})

	it('тост — status, срочный — alert; фокусируемый; крестик назван текстом', async () => {
		const { show } = render()

		show('Сохранено')
		show({ text: 'Ошибка сети', alert: true })
		await nextTick()

		const [urgent, polite] = toasts()

		expect(urgent?.getAttribute('role')).toBe('alert')
		expect(polite?.getAttribute('role')).toBe('status')
		expect(polite?.getAttribute('tabindex')).toBe('0')
		expect(polite?.dataset.open).toBe('true')
		expect(polite?.dataset.swiping).toBe('false')
		expect(find('.so-toasts-item__close', polite).getAttribute('aria-label')).toBe(
			'Close Сохранено',
		)
	})

	it('атрибуты потребителя — на регионе', () => {
		render({ class: 'so-test-region', 'data-test': 'toasts' })

		expect(region().classList.contains('so-test-region')).toBe(true)
		expect(region().dataset.test).toBe('toasts')
	})
})
