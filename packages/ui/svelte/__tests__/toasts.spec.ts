/**
 * Toasts в Svelte — проводка целиком, на настоящей разметке.
 *
 * Очередь, предел видимых и закрытие проверяет ядро
 * (`core/__tests__/toasts.spec.ts`), отсчёт, удаление, клавиши и жест — плагины;
 * здесь важно, что они сходятся: менеджер оборачивает приложение и отдаёт API
 * тостов лифтом, регион телепортирован и стоит пустым, тосты рисуются по
 * показанным — в цели телепорта, отдельным корнем Svelte, куда лифт доходит
 * контекстами места, — слоты пробрасываются, значок — по виду сообщения, а
 * пока тост ждёт, на его месте кольцо, своё содержимое — компонент Svelte —
 * получает тост и закрывает его, а закрытый тост уходит из разметки. Сценарии
 * — те же, что у Vue (`toasts.spec.ts`).
 *
 * Своё у Svelte — слоты. Сниппет непрозрачен: что он нарисовал, тост не
 * видит, поэтому заданный менеджеру слот стоит у каждого тоста вместо своего —
 * даже там, где сниппет пуст, как у ListBox (`list-box.spec.ts`). У Vue пустой
 * слот уступает место своему.
 *
 * Раскладку, переходы темы и настоящий указатель jsdom не выполняет — место,
 * стопка, уход и жест мышью — `playground/vue/browser/toasts.spec.ts`.
 */

import { describe, it, expect } from 'vitest'
import { flushSync } from 'svelte'
import { createEngineTags, createEngineToasts } from '@soldy-ui/core'
import type { IToastsApi, IToastsItem, TToastsItemType } from '@soldy-ui/core'
import { ruRU } from '@soldy-ui/plugins'
import { getIcon } from '@soldy-ui/setup'
import type { TIconRole } from '@soldy-ui/setup'
import type { TToastRender, ToastsProps } from '@soldy-ui/svelte'
import Harness, { type TToastsSlot } from './Toasts.test.svelte'
import App from './ToastsApp.test.svelte'
import ToastUndo from './ToastUndo.test.svelte'
import { contentOf, find, mount, nextFrame, type TMounted } from './mount'

const node = (selector: string, scope: ParentNode = document) => find(scope, selector, HTMLElement)

const region = () => node('.so-toasts')
const toasts = () => [...document.querySelectorAll<HTMLElement>('.so-toasts-item')]
const texts = () => toasts().map((toast) => node('.so-toasts-item__text', toast).textContent)

/** API, которое взял потомок менеджера при своей инициализации. */
type TApi = IToastsApi<TToastRender>

/**
 * Приложение под менеджером: потомок берёт API тостов и отдаёт его тесту.
 * Слоты менеджера — `slots`.
 */
function render(
	props: ToastsProps = {},
	slots: readonly TToastsSlot[] = [],
): { api: TApi; mounted: TMounted } {
	let api: TApi | null = null

	const mounted = mount(Harness, {
		toasts: props,
		slots,
		onApi: (taken) => {
			api = taken
		},
	})

	if (!api) throw new Error('useToasts() не позвали')

	return { api, mounted }
}

/** Показать и дорисовать: `show` пишет в коллекцию, разметка — на такте Svelte. */
function show(api: TApi, ...inputs: Parameters<TApi['show']>[0][]): (IToastsItem | undefined)[] {
	const shown = inputs.map((input) => api.show(input))

	flushSync()

	return shown
}

/** Первый показанный тост; нет его — тест падает здесь. */
function first(shown: (IToastsItem | undefined)[]): IToastsItem {
	const [toast] = shown

	if (!toast) throw new Error('тоста нет')

	return toast
}

describe('Toasts · менеджер и API', () => {
	it('приложение рисуется в children, регион — телепортом в body и пустым', () => {
		render()

		expect(node('.so-test-app').textContent).toBe('Приложение')
		expect(document.body.contains(region())).toBe(true)
		expect(region().contains(node('.so-test-app'))).toBe(false)
		expect(toasts()).toEqual([])
	})

	it('useToasts() в потомке: show рисует тост, новый — первым', () => {
		const { api } = render()

		show(api, 'Сохранено', { text: 'Отправлено', description: 'Письмо ушло' })

		expect(texts()).toEqual(['Отправлено', 'Сохранено'])
		expect(node('.so-toasts-item__description', toasts()[0]).textContent).toBe('Письмо ушло')
	})

	it('useToasts() без менеджера выше — ошибка', () => {
		expect(() => mount(App, {})).toThrow(/<Toasts>/)
	})

	it('предел видимых: показаны первые max, остальные ждут', () => {
		const { api } = render({ max: 2 })

		show(api, 'Первый', 'Второй', 'Третий')

		expect(texts()).toEqual(['Третий', 'Второй'])
	})

	it('приложение рисуется и без региона', () => {
		const { api } = render({ rendered: false })

		show(api, 'Сохранено')

		expect(node('.so-test-app').textContent).toBe('Приложение')
		expect(document.querySelector('.so-toasts')).toBeNull()
	})

	/** Своей разметки вокруг приложения у менеджера нет: регион — в цели телепорта. */
	it('рядом с приложением — ни обёртки, ни пробела', () => {
		const { mounted } = render()

		expect(contentOf(mounted.container)).toEqual(['main'])
	})
})

describe('Toasts · стопка', () => {
	/** Глубина каждого тоста — переменная, которую разметка отдаёт теме. */
	const depths = () => toasts().map((toast) => toast.style.getPropertyValue('--so-toasts-depth'))

	it('раскладка — модификатор региона: столбец по умолчанию, стопка по пропу', () => {
		const { mounted } = render()

		expect(region().classList.contains('so-toasts--layout-list')).toBe(true)

		mounted.destroy()
		document.body.innerHTML = ''
		render({ layout: 'cascade' })

		expect(region().classList.contains('so-toasts--layout-cascade')).toBe(true)
		expect(region().classList.contains('so-toasts--layout-list')).toBe(false)
	})

	it('глубина — место в составе; перестановка меняет и порядок узлов, и глубину', () => {
		const engine = createEngineToasts()
		const { api } = render({ engine, layout: 'cascade' })
		const oldest = first(show(api, 'Первый'))

		show(api, 'Второй', 'Третий')

		expect(texts()).toEqual(['Третий', 'Второй', 'Первый'])
		expect(depths()).toEqual(['0', '1', '2'])

		engine.extensions.plain.move(oldest, 0)
		flushSync()

		expect(texts()).toEqual(['Первый', 'Третий', 'Второй'])
		expect(depths()).toEqual(['0', '1', '2'])
	})

	/** Глубина — переменная, а не CSS-свойство `order`: порядок узлов и есть порядок коллекции. */
	it('своего свойства order у тоста нет', () => {
		const { api } = render({ layout: 'cascade' })

		show(api, 'Первый', 'Второй')

		expect(toasts().map((toast) => toast.style.order)).toEqual(['', ''])
	})

	it('колесо над стопкой листает её: передний уходит назад', async () => {
		const { api } = render({ layout: 'cascade' })

		show(api, 'Первый', 'Второй')
		// Слушатели стопки встают на регион с его узлом — кадром позже
		await nextFrame()

		const event = new WheelEvent('wheel', { deltaY: 100, bubbles: true, cancelable: true })

		toasts()[0]?.dispatchEvent(event)
		flushSync()

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
	it('тег вне Tags рисуется сам по себе, тостом не становится', () => {
		const engine = createEngineToasts()

		mount(Harness, { toasts: { engine }, content: 'tag' })

		expect(node('.so-tags-item').textContent).toContain('Тег')
		expect(engine.extensions.batch.items).toEqual([])
		expect(toasts()).toEqual([])
	})

	it('тег в своём Tags под менеджером входит в Tags', () => {
		const engine = createEngineToasts()
		const tags = createEngineTags()

		mount(Harness, { toasts: { engine }, content: 'tags', tags: { engine: tags } })

		expect(tags.extensions.batch.items.map((item) => item.value)).toEqual(['a'])
		expect(engine.extensions.batch.items).toEqual([])
		expect(toasts()).toEqual([])
	})
})

describe('Toasts · движок снаружи', () => {
	it('тосты, показанные до монтирования, рисуются', () => {
		const engine = createEngineToasts()

		engine.extensions.toasts.show('До монтирования')

		render({ engine })

		expect(texts()).toEqual(['До монтирования'])
	})

	it('код вне компонентов показывает тост тем же API после монтирования', () => {
		const engine = createEngineToasts()
		const { api } = render({ engine })

		expect(api.show).toBe(engine.extensions.toasts.show)

		engine.extensions.toasts.show('Из кода')
		flushSync()

		expect(texts()).toEqual(['Из кода'])
	})
})

describe('Toasts · закрытие', () => {
	it('крестик закрывает тост: data-open="false", а после переходов он уходит', async () => {
		const { api } = render()
		const toast = first(show(api, 'Сохранено'))

		node('.so-toasts-item__close').click()
		flushSync()

		expect(toast.open).toBe(false)
		expect(toasts()[0]?.dataset.open).toBe('false')

		// Переходов в jsdom нет — тост уходит тем же кадром
		await nextFrame()

		expect(toasts()).toEqual([])
	})

	it('закрытие из кода — тот же путь', async () => {
		const { api } = render()
		const toast = first(show(api, 'Сохранено'))

		toast.close()
		await nextFrame()

		expect(toasts()).toEqual([])
	})

	it('без крестика: closable: false', () => {
		const { api } = render()

		show(api, { text: 'Важно', closable: false })

		expect(toasts()[0]?.querySelector('.so-toasts-item__close')).toBeNull()
	})
})

describe('Toasts · своё содержимое (render)', () => {
	it('компонент получает тост пропом toast, и кнопка внутри закрывает его', () => {
		const { api } = render()
		const toast = first(show(api, { text: 'Удалено', render: ToastUndo }))
		const undo = node('.so-toasts-item__content .so-test-undo')

		expect(undo.textContent).toBe('Отменить')
		expect(undo.dataset.uid).toBe(String(toast.uid))

		undo.click()
		flushSync()

		expect(toast.open).toBe(false)
	})

	/**
	 * Пустые части тема сворачивает по `:empty`, поэтому вокруг них разметка
	 * пробелов не ставит. Пустоту меряет `contentOf`: метки блоков Svelte и
	 * пустой текст `:empty` не видит, а jsdom считает пустой текст содержимым.
	 */
	it('без render часть содержимого пуста', () => {
		const { api } = render()

		show(api, 'Сохранено')

		expect(contentOf(node('.so-toasts-item__content'))).toEqual([])
	})

	/**
	 * Компонент Svelte 5 — функция, и объект Svelte нарисовать не может: ядро
	 * держит `render` как `unknown`, и не компонент разметка не рисует. Чужое
	 * значение приходит кодом вне компонентов — у API движка тип `render` не
	 * сужен.
	 */
	it('render — не компонент: часть содержимого пуста', () => {
		const engine = createEngineToasts()

		render({ engine })
		engine.extensions.toasts.show({ text: 'Сохранено', render: { component: 'нет' } })
		flushSync()

		expect(contentOf(node('.so-toasts-item__content'))).toEqual([])
	})

	it('без описания часть описания пуста, а текст — нет', () => {
		const { api } = render()

		show(api, 'Сохранено')

		expect(contentOf(node('.so-toasts-item__description'))).toEqual([])
		expect(contentOf(node('.so-toasts-item__text'))).toEqual(['#text «Сохранено»'])
	})
})

describe('Toasts · слоты', () => {
	it('item — текст со scope { item, text }, item-content — своё содержимое', () => {
		const { api } = render({}, ['item', 'item-content'])
		const toast = first(show(api, 'Сохранено'))

		expect(node('.so-test-text').textContent).toBe('Сохранено!')
		expect(node('.so-test-text').dataset.uid).toBe(String(toast.uid))
		expect(node('.so-toasts-item__content .so-test-content').textContent).toBe('Сохранено')
	})

	it('item-close-icon подменяет иконку крестика', () => {
		const { api } = render({}, ['item-close-icon'])

		show(api, 'Сохранено')

		expect(node('.so-toasts-item__close .so-test-x')).toBeTruthy()
		expect(node('.so-toasts-item__close').querySelector('svg')).toBeNull()
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
	const iconBox = () => node('.so-toasts-item__icon', toasts()[0])

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

	it('коробка стоит всегда, даже без слота, и спрятана от скринридера', () => {
		const { api } = render()

		show(api, 'Сохранено')

		expect(iconBox().getAttribute('aria-hidden')).toBe('true')
	})

	it.each<[TToastsItemType | undefined, TIconRole]>([
		[undefined, 'notification'],
		['info', 'info'],
		['success', 'success'],
		['warning', 'warning'],
		['error', 'error'],
	])('вид %s — значок роли %s', (type, role) => {
		const { api } = render()

		show(api, { text: 'Сообщение', type })

		expect(glyph()).toBe(bodyOf(role))
	})

	it('смена вида меняет значок, снятый вид возвращает значок обычного сообщения', () => {
		const { api } = render()
		const toast = first(show(api, 'Сохраняем…'))

		toast.type = 'success'
		flushSync()

		expect(glyph()).toBe(bodyOf('success'))

		toast.type = undefined
		flushSync()

		expect(glyph()).toBe(bodyOf('notification'))
	})

	it('item-icon подменяет значок и получает { item, type }; смена вида доходит до сниппета', () => {
		const { api } = render({}, ['item-icon'])
		const toast = first(show(api, { text: 'Нет сети', type: 'error' }))
		const icon = node('.so-test-icon', iconBox())

		expect(iconBox().children).toHaveLength(1)
		expect(icon.dataset.uid).toBe(String(toast.uid))
		expect(icon.dataset.type).toBe('error')

		toast.type = 'success'
		flushSync()

		expect(node('.so-test-icon', iconBox()).dataset.type).toBe('success')
	})

	/**
	 * Сниппет непрозрачен: что он нарисовал у тоста, тот не видит, — и
	 * заданный менеджеру значок стоит у каждого тоста вместо значка вида, даже
	 * где сниппет пуст. У Vue пустой слот уступает место значку вида. Значок
	 * вида такому тосту рисует сам сниппет — веткой по `type`.
	 */
	it('пустой item-icon стоит вместо значка вида: коробка остаётся пустой', () => {
		const { api } = render({}, ['empty-icon'])

		show(api, { text: 'Место почти закончилось', type: 'warning' })

		expect(contentOf(iconBox())).toEqual([])
		expect(iconBox().querySelector('svg')).toBeNull()
	})

	it('пока тост ждёт — в коробке одно бегущее кольцо; снятое ожидание возвращает значок', () => {
		const { api } = render()
		const toast = first(show(api, { text: 'Сохраняем…', loading: true }))
		const [ring, ...rest] = iconBox().children

		expect(rest).toEqual([])
		expect(ring?.classList.contains('so-progress-spinner')).toBe(true)
		expect(ring?.getAttribute('data-indeterminate')).toBe('true')

		toast.loading = false
		toast.type = 'success'
		flushSync()

		expect(glyph()).toBe(bodyOf('success'))
	})

	it('кольцо встаёт и на место своего значка из item-icon', () => {
		const { api } = render({}, ['item-icon'])
		const toast = first(show(api, { text: 'Отправляем…', type: 'info', loading: true }))

		expect(iconBox().querySelector('.so-test-icon')).toBeNull()
		expect(iconBox().querySelectorAll('.so-progress-spinner')).toHaveLength(1)

		toast.loading = false
		flushSync()

		expect(iconBox().querySelector('.so-progress-spinner')).toBeNull()
		expect(node('.so-test-icon', iconBox())).toBeTruthy()
	})
})

describe('Toasts · ARIA', () => {
	it('регион — region с живой областью и именем от локали', () => {
		mount(Harness, { locale: ruRU })

		expect(region().getAttribute('role')).toBe('region')
		expect(region().getAttribute('aria-live')).toBe('polite')
		expect(region().getAttribute('aria-label')).toBe('Уведомления (F8)')
		expect(region().dataset.layer).toBeDefined()
	})

	it('тост — status, срочный — alert; фокусируемый; крестик назван текстом', () => {
		const { api } = render()

		show(api, 'Сохранено', { text: 'Ошибка сети', alert: true })

		const [urgent, polite] = toasts()

		expect(urgent?.getAttribute('role')).toBe('alert')
		expect(polite?.getAttribute('role')).toBe('status')
		expect(polite?.getAttribute('tabindex')).toBe('0')
		expect(polite?.dataset.open).toBe('true')
		expect(polite?.dataset.swiping).toBe('false')
		expect(node('.so-toasts-item__close', polite).getAttribute('aria-label')).toBe(
			'Close Сохранено',
		)
	})

	it('атрибуты потребителя — на регионе', () => {
		render({ class: 'so-test-region', 'data-test': 'toasts' })

		expect(region().classList.contains('so-test-region')).toBe(true)
		expect(region().dataset.test).toBe('toasts')
	})
})
