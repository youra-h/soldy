/**
 * Toasts во Vue — проводка целиком, на настоящей разметке.
 *
 * Очередь, предел видимых и закрытие проверяет ядро
 * (`core/__tests__/toasts.spec.ts`), отсчёт, удаление, клавиши и жест — плагины;
 * здесь важно, что они сходятся: менеджер оборачивает приложение и отдаёт API
 * тостов лифтом, регион телепортирован и стоит пустым, тосты рисуются по
 * показанным, слоты пробрасываются, значок — по виду сообщения, а пока тост
 * ждёт, на его месте кольцо, своё содержимое получает тост и закрывает его, а
 * закрытый тост уходит из разметки.
 *
 * Раскладку, переходы темы и настоящий указатель jsdom не выполняет — место,
 * стопка, уход и жест мышью — `playground/vue/browser/toasts.spec.ts`.
 */

import { describe, it, expect, afterEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { defineComponent, h, nextTick, type VNode } from 'vue'
import { createEngineTags, createEngineToasts } from '@soldy-ui/core'
import type { IToastsItem, IToastsProps, TToastsItemType } from '@soldy-ui/core'
import { ruRU } from '@soldy-ui/plugins'
import { getIcon } from '@soldy-ui/setup'
import type { TIconRole } from '@soldy-ui/setup'
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

/** Scope слота менеджера: тост и scope его слота — текст или вид. */
type TSlotScope = { item: IToastsItem; text?: string; type?: TToastsItemType }

/**
 * Приложение под менеджером: потомок берёт API тостов и отдаёт его тесту.
 * Слоты менеджера — `slots`.
 */
function render(
	props: Partial<IToastsProps> & Record<string, unknown> = {},
	slots: Record<string, (scope: TSlotScope) => VNode | VNode[]> = {},
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

	it('item-close-icon подменяет иконку крестика', async () => {
		const { show } = render({}, { 'item-close-icon': () => h('i', { class: 'so-test-x' }) })

		show('Сохранено')
		await nextTick()

		expect(find('.so-toasts-item__close .so-test-x')).toBeTruthy()
	})
})

/**
 * Значок: коробка стоит всегда, в ней значок вида по роли иконки, свой значок
 * из `item-icon` или, пока тост ждёт, бегущее кольцо. Цвет значку даёт тема по
 * модификатору вида — его видно только в браузере
 * (`playground/vue/browser/toasts.spec.ts`).
 */
describe('Toasts · значок', () => {
	/** Коробка значка первого тоста. */
	const iconBox = () => find('.so-toasts-item__icon', toasts()[0])

	/** Содержимое `<svg>` иконки роли так, как его сериализует документ. */
	function bodyOf(role: TIconRole): string {
		const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg')

		svg.innerHTML = getIcon(role).body

		return svg.innerHTML
	}

	/** Рисунок значка в коробке: содержимое иконки, её единственного ребёнка. */
	function glyph(): string {
		const [icon, ...rest] = iconBox().children

		if (!icon || rest.length > 0) throw new Error('в коробке не один узел')
		if (!icon.classList.contains('so-icon')) throw new Error('в коробке не иконка')

		return icon.innerHTML
	}

	it('коробка стоит всегда, даже без слота, и спрятана от скринридера', async () => {
		const { show } = render()

		show('Сохранено')
		await nextTick()

		expect(iconBox().getAttribute('aria-hidden')).toBe('true')
	})

	it.each<[TToastsItemType | undefined, TIconRole]>([
		[undefined, 'notification'],
		['info', 'info'],
		['success', 'success'],
		['warning', 'warning'],
		['error', 'error'],
	])('вид %s — значок роли %s', async (type, role) => {
		const { show } = render()

		show({ text: 'Сообщение', type })
		await nextTick()

		expect(glyph()).toBe(bodyOf(role))
	})

	it('значки пяти видов разные: в принудительных цветах вид различает только глиф', () => {
		const roles: TIconRole[] = ['notification', 'info', 'success', 'warning', 'error']

		expect(new Set(roles.map(bodyOf)).size).toBe(roles.length)
	})

	it('смена вида меняет значок, снятый вид возвращает значок обычного сообщения', async () => {
		const { show } = render()
		const toast = show('Сохраняем…')

		await nextTick()

		if (!toast) throw new Error('тоста нет')

		toast.type = 'success'
		await nextTick()

		expect(glyph()).toBe(bodyOf('success'))

		toast.type = undefined
		await nextTick()

		expect(glyph()).toBe(bodyOf('notification'))
	})

	it('item-icon подменяет значок и получает { item, type }; смена вида доходит до слота', async () => {
		const { show } = render(
			{},
			{
				'item-icon': ({ item, type }) =>
					h('i', { class: 'so-test-icon', 'data-uid': item.uid, 'data-type': type }),
			},
		)
		const toast = show({ text: 'Нет сети', type: 'error' })

		await nextTick()

		if (!toast) throw new Error('тоста нет')

		const icon = find('.so-test-icon', iconBox())

		expect(iconBox().children).toHaveLength(1)
		expect(icon.dataset.uid).toBe(String(toast.uid))
		expect(icon.dataset.type).toBe('error')

		toast.type = 'success'
		await nextTick()

		expect(find('.so-test-icon', iconBox()).dataset.type).toBe('success')
	})

	it('пустой item-icon уступает место значку вида, как пустые слоты-иконки элементов', async () => {
		const { show } = render({}, { 'item-icon': () => [] })

		show({ text: 'Место почти закончилось', type: 'warning' })
		await nextTick()

		expect(glyph()).toBe(bodyOf('warning'))
	})

	it('пока тост ждёт — в коробке одно бегущее кольцо; снятое ожидание возвращает значок', async () => {
		const { show } = render()
		const toast = show({ text: 'Сохраняем…', loading: true })

		await nextTick()

		if (!toast) throw new Error('тоста нет')

		const [ring, ...rest] = iconBox().children

		expect(rest).toEqual([])
		expect(ring?.classList.contains('so-progress-spinner')).toBe(true)
		expect(ring?.getAttribute('data-indeterminate')).toBe('true')

		toast.loading = false
		toast.type = 'success'
		await nextTick()

		expect(glyph()).toBe(bodyOf('success'))
	})

	it('кольцо встаёт и на место своего значка из item-icon', async () => {
		const { show } = render({}, { 'item-icon': () => h('i', { class: 'so-test-icon' }) })
		const toast = show({ text: 'Отправляем…', type: 'info', loading: true })

		await nextTick()

		if (!toast) throw new Error('тоста нет')

		expect(iconBox().querySelector('.so-test-icon')).toBeNull()
		expect(iconBox().querySelectorAll('.so-progress-spinner')).toHaveLength(1)

		toast.loading = false
		await nextTick()

		expect(iconBox().querySelector('.so-progress-spinner')).toBeNull()
		expect(find('.so-test-icon', iconBox())).toBeTruthy()
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

		// Номер слоя открыт только у слоя с узлом: его даёт кадр узла
		await nextFrame()

		expect(region().dataset.layer).toBeDefined()
		expect(region().style.zIndex).toBe(region().dataset.layer)
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
