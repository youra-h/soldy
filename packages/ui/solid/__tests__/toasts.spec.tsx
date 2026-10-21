/**
 * Toasts в Solid — проводка целиком, на настоящей разметке.
 *
 * Очередь, предел видимых и закрытие проверяет ядро
 * (`core/__tests__/toasts.spec.ts`), отсчёт, удаление, клавиши и жест — плагины;
 * здесь важно, что они сходятся: менеджер оборачивает приложение и отдаёт API
 * тостов лифтом, регион телепортирован и стоит пустым, тосты рисуются по
 * показанным, слоты пробрасываются, значок — по виду сообщения, а пока тост
 * ждёт, на его месте кольцо, своё содержимое — компонент Solid — получает тост
 * и закрывает его, а закрытый тост уходит из разметки. Сценарии — те же, что у
 * Vue (`ui/vue/__tests__/toasts.spec.ts`); тега вне набора, как у Vue, в Solid
 * нет — элемент чужой коллекции под менеджером здесь пункт ListBox.
 *
 * Своё у Solid — лифт. Приложение и регион стоят в слое менеджера (`Elevate`):
 * приложение берёт из него API, а тосты в регионе — движок, хотя регион
 * телепортирован: содержимое портала собирается под владельцем места, где
 * стоит телепорт. Так же API находит компонент в окне под менеджером. Проброс
 * слотов — функцией (`relaySlot`), и пустое, что вернул слот менеджера, тост
 * заменяет своим, как у Vue, а не оставляет пустым, как Svelte.
 *
 * Раскладку, переходы темы и настоящий указатель jsdom не выполняет — место,
 * стопка, уход и жест мышью — `playground/vue/browser/toasts.spec.ts`.
 */

import { describe, it, expect } from 'vitest'
import type { JSX } from 'solid-js'
import { createEngineListBox, createEngineToasts } from '@soldy-ui/core'
import type { IToastsItem, TToastsItemType } from '@soldy-ui/core'
import { ruRU } from '@soldy-ui/plugins'
import { getIcon } from '@soldy-ui/setup'
import type { TIconRole } from '@soldy-ui/setup'
import {
	Dialog,
	ListBox,
	LocaleProvider,
	Toasts,
	useToasts,
	type TToastRender,
	type ToastsProps,
} from '@soldy-ui/solid'
import { find, mount, nextFrame, type TMounted } from './mount'

/** Узел по селектору; нет его — тест падает здесь, а не на чтении свойства. */
const node = (selector: string, scope: ParentNode = document) => find(scope, selector, HTMLElement)

const region = () => node('.so-toasts')
const toasts = () => [...document.querySelectorAll<HTMLElement>('.so-toasts-item')]
const texts = () => toasts().map((toast) => node('.so-toasts-item__text', toast).textContent)

/** API, которое взял потомок менеджера: его тело зовёт `useToasts()`. */
type TApi = ReturnType<typeof useToasts>

/**
 * Приложение под менеджером: потомок берёт API тостов и отдаёт его тесту.
 * Пропсы менеджера — с его слотами; `data-*` в JSX — атрибут, а объекту его
 * тип называет сам.
 */
function render(props: ToastsProps & { [name: `data-${string}`]: string } = {}): {
	api: TApi
	mounted: TMounted
} {
	const taken: { api?: TApi } = {}

	function App(): JSX.Element {
		taken.api = useToasts()

		return <main class="so-test-app">Приложение</main>
	}

	const mounted = mount(() => (
		<Toasts {...props}>
			<App />
		</Toasts>
	))
	const api = taken.api

	if (!api) throw new Error('useToasts() не позвали')

	return { api, mounted }
}

/** Тост, который отдал `show`; не показан — тест падает здесь. */
function shown(toast: IToastsItem | undefined): IToastsItem {
	if (!toast) throw new Error('тоста нет')

	return toast
}

describe('Toasts · менеджер и API', () => {
	it('приложение рисуется в children, регион — телепортом в цель, видимым и пустым', () => {
		const { mounted } = render()

		expect(node('.so-test-app').textContent).toBe('Приложение')
		expect(document.body.contains(region())).toBe(true)
		expect(mounted.container.contains(region())).toBe(false)
		expect(region().style.display).toBe('')
		expect(toasts()).toEqual([])
	})

	it('useToasts() в потомке: show рисует тост, новый — первым', () => {
		const { api } = render()

		api.show('Сохранено')
		api.show({ text: 'Отправлено', description: 'Письмо ушло' })

		expect(texts()).toEqual(['Отправлено', 'Сохранено'])
		expect(node('.so-toasts-item__description', toasts()[0]).textContent).toBe('Письмо ушло')
	})

	it('useToasts() без менеджера выше — ошибка', () => {
		function Orphan(): JSX.Element {
			useToasts()

			return null
		}

		expect(() => mount(() => <Orphan />)).toThrow(/<Toasts>/)
	})

	it('предел видимых: показаны первые max, остальные ждут', () => {
		const { api } = render({ max: 2 })

		api.show('Первый')
		api.show('Второй')
		api.show('Третий')

		expect(texts()).toEqual(['Третий', 'Второй'])
	})

	it('приложение рисуется и без региона', () => {
		const { api } = render({ rendered: false })

		api.show('Сохранено')

		expect(node('.so-test-app').textContent).toBe('Приложение')
		expect(document.querySelector('.so-toasts')).toBeNull()
	})

	it('ref потребителя — регион', () => {
		const nodes: Element[] = []

		render({ ref: (element) => nodes.push(element) })

		expect(nodes).toHaveLength(1)
		expect(nodes[0]).toBe(region())
	})
})

describe('Toasts · стопка', () => {
	/** Глубина каждого тоста — переменная, которую разметка отдаёт теме. */
	const depths = () => toasts().map((toast) => toast.style.getPropertyValue('--so-toasts-depth'))

	it('раскладка — модификатор региона: столбец по умолчанию, стопка по пропу', () => {
		const { mounted } = render()

		expect(region().classList.contains('so-toasts--layout-list')).toBe(true)

		mounted.destroy()
		render({ layout: 'cascade' })

		expect(region().classList.contains('so-toasts--layout-cascade')).toBe(true)
		expect(region().classList.contains('so-toasts--layout-list')).toBe(false)
	})

	/**
	 * Тосты — экземпляры, и петля по ним переставляет узлы, а не рисует их
	 * заново: переставленный тост — тот же узел.
	 */
	it('глубина — место в составе; перестановка меняет порядок узлов и глубину, узлы те же', () => {
		const engine = createEngineToasts()
		const { api } = render({ engine, layout: 'cascade' })
		const oldest = shown(api.show('Первый'))

		api.show('Второй')
		api.show('Третий')

		expect(texts()).toEqual(['Третий', 'Второй', 'Первый'])
		expect(depths()).toEqual(['0', '1', '2'])

		const [third, second, first] = toasts()

		engine.extensions.plain.move(oldest, 0)

		expect(texts()).toEqual(['Первый', 'Третий', 'Второй'])
		expect(depths()).toEqual(['0', '1', '2'])
		expect(toasts()).toEqual([first, third, second])
	})

	/**
	 * Глубина — переменная, а не CSS-свойство `order`: порядок узлов и есть
	 * порядок коллекции. Состояние тоста несёт `order` фасада, и раскладка корня
	 * поставила бы его свойством, отдай ей тост состояние целиком.
	 */
	it('своего свойства order у тоста нет', () => {
		const { api } = render({ layout: 'cascade' })

		api.show('Первый')
		api.show('Второй')

		expect(toasts().map((toast) => toast.style.order)).toEqual(['', ''])
	})

	it('колесо над стопкой листает её: передний уходит назад', async () => {
		const { api } = render({ layout: 'cascade' })

		api.show('Первый')
		api.show('Второй')
		// Слушатели стопки встают на регион с его узлом — кадром позже
		await nextFrame()

		const event = new WheelEvent('wheel', { deltaY: 100, bubbles: true, cancelable: true })

		toasts()[0]?.dispatchEvent(event)

		expect(event.defaultPrevented).toBe(true)
		expect(texts()).toEqual(['Первый', 'Второй'])
	})
})

/**
 * Менеджер оборачивает приложение, и его коллекция — ближайшая выше почти
 * везде в дереве. Элемент коллекции входит только в коллекцию своего типа:
 * пункт ListBox вне своего списка под менеджером рисуется сам по себе, а не
 * становится тостом и не роняет сборку приложения.
 */
describe('Toasts · элемент чужой коллекции под менеджером', () => {
	it('пункт ListBox вне списка рисуется сам по себе, тостом не становится', () => {
		const engine = createEngineToasts()

		mount(() => (
			<Toasts engine={engine}>
				<ListBox.Item value="a" text="Пункт" />
			</Toasts>
		))

		expect(node('.so-list-box-item').textContent).toContain('Пункт')
		expect(engine.extensions.batch.items).toEqual([])
		expect(toasts()).toEqual([])
	})

	it('пункт в своём ListBox под менеджером входит в ListBox', () => {
		const engine = createEngineToasts()
		const list = createEngineListBox()

		mount(() => (
			<Toasts engine={engine}>
				<ListBox engine={list}>
					<ListBox.Item value="a" text="Пункт" />
				</ListBox>
			</Toasts>
		))

		expect(list.extensions.batch.items.map((item) => item.value)).toEqual(['a'])
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

		expect(texts()).toEqual(['Из кода'])
	})
})

describe('Toasts · закрытие', () => {
	it('крестик закрывает тост: data-open="false", а после переходов он уходит', async () => {
		const { api } = render()
		const toast = shown(api.show('Сохранено'))

		node('.so-toasts-item__close').click()

		expect(toast.open).toBe(false)
		expect(toasts()[0]?.dataset.open).toBe('false')

		// Переходов в jsdom нет — тост уходит тем же кадром
		await nextFrame()

		expect(toasts()).toEqual([])
	})

	it('закрытие из кода — тот же путь', async () => {
		const { api } = render()
		const toast = shown(api.show('Сохранено'))

		toast.close()
		await nextFrame()

		expect(toasts()).toEqual([])
	})

	it('без крестика: closable: false', () => {
		const { api } = render()

		api.show({ text: 'Важно', closable: false })

		expect(toasts()[0]?.querySelector('.so-toasts-item__close')).toBeNull()
	})
})

describe('Toasts · своё содержимое (render)', () => {
	it('компонент получает тост пропом toast, и кнопка внутри закрывает его', () => {
		const Undo: TToastRender = (props) => (
			<button
				class="so-test-undo"
				data-uid={String(props.toast.uid)}
				onClick={() => props.toast.close()}
			>
				Отменить
			</button>
		)
		const { api } = render()
		const toast = shown(api.show({ text: 'Удалено', render: Undo }))
		const undo = node('.so-toasts-item__content .so-test-undo')

		expect(undo.textContent).toBe('Отменить')
		expect(undo.dataset.uid).toBe(String(toast.uid))

		undo.click()

		expect(toast.open).toBe(false)
	})

	it('смена render у тоста рисует новое содержимое', () => {
		const First: TToastRender = () => <em class="so-test-first">Первое</em>
		const Second: TToastRender = () => <em class="so-test-second">Второе</em>
		const { api } = render()
		const toast = shown(api.show({ text: 'Готово', render: First }))

		expect(node('.so-toasts-item__content .so-test-first')).toBeTruthy()

		toast.render = Second

		expect(document.querySelector('.so-test-first')).toBeNull()
		expect(node('.so-toasts-item__content .so-test-second')).toBeTruthy()
	})

	it('без render часть содержимого пуста', () => {
		const { api } = render()

		api.show('Сохранено')

		expect(node('.so-toasts-item__content').childNodes).toHaveLength(0)
	})

	/**
	 * Компонент Solid — функция, и объект Solid нарисовать не может: ядро держит
	 * `render` как `unknown`, и не компонент разметка не рисует. Чужое значение
	 * приходит кодом вне компонентов — у API движка тип `render` не сужен.
	 */
	it('render — не компонент: часть содержимого пуста', () => {
		const engine = createEngineToasts()

		render({ engine })
		engine.extensions.toasts.show({ text: 'Сохранено', render: { component: 'нет' } })

		expect(node('.so-toasts-item__content').childNodes).toHaveLength(0)
	})

	it('без описания часть описания пуста, а текст — нет', () => {
		const { api } = render()

		api.show('Сохранено')

		expect(node('.so-toasts-item__description').childNodes).toHaveLength(0)
		expect(node('.so-toasts-item__text').textContent).toBe('Сохранено')
	})
})

describe('Toasts · слоты', () => {
	it('item — текст со scope { item, text }, item-content — своё содержимое', () => {
		const { api } = render({
			item: (scope) => (
				<strong class="so-test-text" data-uid={String(scope.item.uid)}>
					{scope.text}!
				</strong>
			),
			'item-content': (scope) => <span class="so-test-content">{scope.item.text}</span>,
		})
		const toast = shown(api.show('Сохранено'))

		expect(node('.so-test-text').textContent).toBe('Сохранено!')
		expect(node('.so-test-text').dataset.uid).toBe(String(toast.uid))
		expect(node('.so-toasts-item__content .so-test-content').textContent).toBe('Сохранено')
	})

	/** Scope слота живой: прочитанное в разметке идёт за текстом тоста тем же узлом. */
	it('смена текста доходит до слота item тем же узлом', () => {
		const { api } = render({
			item: (scope) => <strong class="so-test-text">{scope.text}!</strong>,
		})
		const toast = shown(api.show('Сохраняем…'))
		const text = node('.so-test-text')

		toast.text = 'Сохранено'

		expect(node('.so-test-text')).toBe(text)
		expect(text.textContent).toBe('Сохранено!')
	})

	it('item-close-icon подменяет иконку крестика', () => {
		const { api } = render({ 'item-close-icon': () => <i class="so-test-x" /> })

		api.show('Сохранено')

		expect(node('.so-toasts-item__close .so-test-x')).toBeTruthy()
		expect(node('.so-toasts-item__close').querySelector('svg')).toBeNull()
	})

	/** Слот менеджера, вернувший пустое, уступает место своему — тексту тоста. */
	it('пустой item уступает место тексту тоста', () => {
		const { api } = render({ item: (_scope) => null })

		api.show('Сохранено')

		expect(node('.so-toasts-item__text').textContent).toBe('Сохранено')
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

		api.show('Сохранено')

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

		api.show({ text: 'Сообщение', type })

		expect(glyph()).toBe(bodyOf(role))
	})

	it('значки пяти видов разные: в принудительных цветах вид различает только глиф', () => {
		const roles: TIconRole[] = ['notification', 'info', 'success', 'warning', 'error']

		expect(new Set(roles.map(bodyOf)).size).toBe(roles.length)
	})

	it('смена вида меняет значок, снятый вид возвращает значок обычного сообщения', () => {
		const { api } = render()
		const toast = shown(api.show('Сохраняем…'))

		toast.type = 'success'

		expect(glyph()).toBe(bodyOf('success'))

		toast.type = undefined

		expect(glyph()).toBe(bodyOf('notification'))
	})

	it('item-icon подменяет значок и получает { item, type }; смена вида доходит до слота тем же узлом', () => {
		const { api } = render({
			'item-icon': (scope) => (
				<i class="so-test-icon" data-uid={String(scope.item.uid)} data-type={scope.type} />
			),
		})
		const toast = shown(api.show({ text: 'Нет сети', type: 'error' }))
		const icon = node('.so-test-icon', iconBox())

		expect(iconBox().children).toHaveLength(1)
		expect(icon.dataset.uid).toBe(String(toast.uid))
		expect(icon.dataset.type).toBe('error')

		toast.type = 'success'

		expect(node('.so-test-icon', iconBox())).toBe(icon)
		expect(icon.dataset.type).toBe('success')
	})

	/**
	 * Пустое, что вернул слот менеджера, тост видит (`resolveSlot`) и рисует
	 * свой значок вида — как пустые слоты-иконки у элементов коллекций и как у
	 * Vue. У Svelte сниппет непрозрачен, и коробка там остаётся пустой.
	 */
	it('пустой item-icon уступает место значку вида', () => {
		const { api } = render({ 'item-icon': (_scope) => null })

		api.show({ text: 'Место почти закончилось', type: 'warning' })

		expect(glyph()).toBe(bodyOf('warning'))
	})

	/** Слот решает по scope, рисовать ли своё: пустое у одного вида уступает значку вида. */
	it('item-icon только для ошибки: у остальных — значок вида', () => {
		const { api } = render({
			'item-icon': (scope) => (scope.type === 'error' ? <i class="so-test-icon" /> : null),
		})
		const toast = shown(api.show({ text: 'Нет сети', type: 'error' }))

		expect(node('.so-test-icon', iconBox())).toBeTruthy()

		toast.type = 'warning'

		expect(glyph()).toBe(bodyOf('warning'))
	})

	it('пока тост ждёт — в коробке одно бегущее кольцо; снятое ожидание возвращает значок', () => {
		const { api } = render()
		const toast = shown(api.show({ text: 'Сохраняем…', loading: true }))
		const [ring, ...rest] = iconBox().children

		expect(rest).toEqual([])
		expect(ring?.classList.contains('so-progress-spinner')).toBe(true)
		expect(ring?.getAttribute('data-indeterminate')).toBe('true')

		toast.loading = false
		toast.type = 'success'

		expect(glyph()).toBe(bodyOf('success'))
	})

	it('кольцо встаёт и на место своего значка из item-icon', () => {
		const { api } = render({ 'item-icon': () => <i class="so-test-icon" /> })
		const toast = shown(api.show({ text: 'Отправляем…', type: 'info', loading: true }))

		expect(iconBox().querySelector('.so-test-icon')).toBeNull()
		expect(iconBox().querySelectorAll('.so-progress-spinner')).toHaveLength(1)

		toast.loading = false

		expect(iconBox().querySelector('.so-progress-spinner')).toBeNull()
		expect(node('.so-test-icon', iconBox())).toBeTruthy()
	})
})

describe('Toasts · ARIA', () => {
	it('регион — region с живой областью и именем от локали', () => {
		mount(() => (
			<LocaleProvider locale={ruRU}>
				<Toasts>
					<main>Приложение</main>
				</Toasts>
			</LocaleProvider>
		))

		expect(region().getAttribute('role')).toBe('region')
		expect(region().getAttribute('aria-live')).toBe('polite')
		expect(region().getAttribute('aria-label')).toBe('Уведомления (F8)')
		expect(region().dataset.layer).toBeDefined()
	})

	it('тост — status, срочный — alert; фокусируемый; крестик назван текстом', () => {
		const { api } = render()

		api.show('Сохранено')
		api.show({ text: 'Ошибка сети', alert: true })

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

/**
 * Своё у Solid: приложение и регион — в слое лифта менеджера, а регион и окна
 * — в порталах, чьё содержимое собирается под владельцем места.
 */
describe('Solid', () => {
	/** Своей разметки вокруг приложения у менеджера нет: регион — в цели телепорта. */
	it('рядом с приложением — ни обёртки, ни региона', () => {
		const { mounted } = render()

		expect([...mounted.container.children].map((child) => child.localName)).toEqual(['main'])
		expect(mounted.container.contains(region())).toBe(false)
	})

	/**
	 * Окно рисует содержимое порталом, под владельцем места, где стоит: компонент
	 * в окне под менеджером видит слой менеджера и берёт API, как приложение.
	 */
	it('useToasts() в содержимом окна под менеджером находит API', () => {
		const taken: { api?: TApi } = {}

		function Inside(): JSX.Element {
			taken.api = useToasts()

			return <button class="so-test-inside">В окне</button>
		}

		mount(() => (
			<Toasts>
				<Dialog visible>
					<Inside />
				</Dialog>
			</Toasts>
		))

		const api = taken.api

		expect(node('.so-dialog').contains(node('.so-test-inside'))).toBe(true)

		if (!api) throw new Error('useToasts() в окне не позвали')

		shown(api.show('Из окна'))

		expect(texts()).toEqual(['Из окна'])
	})

	it('снятый менеджер уносит регион из цели', () => {
		const { api, mounted } = render()

		api.show('Сохранено')
		mounted.destroy()

		expect(document.querySelector('.so-toasts')).toBeNull()
		expect(toasts()).toEqual([])
	})
})
