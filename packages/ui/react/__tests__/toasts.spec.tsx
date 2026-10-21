/**
 * Toasts в React — проводка целиком, на настоящей разметке.
 *
 * Очередь, предел видимых и закрытие проверяет ядро
 * (`core/__tests__/toasts.spec.ts`), отсчёт, удаление, клавиши и жест — плагины;
 * здесь важно, что они сходятся: менеджер оборачивает приложение и отдаёт API
 * тостов лифтом, регион телепортирован и стоит пустым, тосты рисуются по
 * показанным, слоты пробрасываются, значок — по виду сообщения, а пока тост
 * ждёт, на его месте кольцо, своё содержимое — компонент React — получает тост
 * и закрывает его, а закрытый тост уходит из разметки. Сценарии — те же, что у
 * Vue (`ui/vue/__tests__/toasts.spec.ts`) и Solid
 * (`ui/solid/__tests__/toasts.spec.tsx`); тега вне набора, как у Vue, в React
 * нет — элемент чужой коллекции под менеджером здесь пункт ListBox.
 *
 * Своё у React. Лифт — контекст React: приложение и регион стоят в слое
 * менеджера (`Elevate`), и регион в портале его видит — портал контекст
 * сохраняет; так же API находит компонент в окне под менеджером. API — значение
 * контекста: пересобранный менеджер (StrictMode) отдаёт новый, и эффект,
 * который показывает тост, держит `show` в зависимостях. Своё содержимое —
 * любой компонент React, объект-компонент (`memo`, `forwardRef`, `lazy`) тоже, а
 * готовый элемент — нет. Портала на сервере нет: регион появляется после
 * гидратации.
 *
 * Раскладку, переходы темы и настоящий указатель jsdom не выполняет — место,
 * стопка, уход и жест мышью — `playground/vue/browser/toasts.spec.ts`.
 */

import { describe, it, expect, vi } from 'vitest'
import {
	Component,
	StrictMode,
	act,
	forwardRef,
	lazy,
	memo,
	useEffect,
	type ReactElement,
} from 'react'
import { hydrateRoot } from 'react-dom/client'
import { renderToString } from 'react-dom/server'
import { createEngineListBox, createEngineToasts } from '@soldy-ui/core'
import type { IToastsItem, TToastInput, TToastsItemType } from '@soldy-ui/core'
import { ruRU } from '@soldy-ui/plugins'
import { getIcon } from '@soldy-ui/setup'
import type { TIconRole } from '@soldy-ui/setup'
import {
	Dialog,
	ListBox,
	LocaleProvider,
	Toasts,
	isToastRender,
	useToasts,
	type TToastRender,
	type ToastsProps,
} from '@soldy-ui/react'
import { find, mount, nextFrame, track, type TMounted } from './mount'

/** Узел по селектору; нет его — тест падает здесь, а не на чтении свойства. */
const node = (selector: string, scope: ParentNode = document) => find(scope, selector, HTMLElement)

const region = () => node('.so-toasts')
const toasts = () => [...document.querySelectorAll<HTMLElement>('.so-toasts-item')]
const texts = () => toasts().map((toast) => node('.so-toasts-item__text', toast).textContent)

/** API, которое взял потомок менеджера: его рендер зовёт `useToasts()`. */
type TApi = ReturnType<typeof useToasts>

/** Пропсы менеджера; `data-*` в JSX — атрибут, а объекту его тип называет сам. */
type TProps = ToastsProps & { [name: `data-${string}`]: string }

/** Приложение под менеджером: потомок берёт API тостов и отдаёт его тесту. */
function render(props: TProps = {}): { api: TApi; mounted: TMounted } {
	const taken: { api?: TApi } = {}

	function App(): ReactElement {
		taken.api = useToasts()

		return <main className="so-test-app">Приложение</main>
	}

	const mounted = mount(
		<Toasts {...props}>
			<App />
		</Toasts>,
	)
	const api = taken.api

	if (!api) throw new Error('useToasts() не позвали')

	return { api, mounted }
}

/**
 * Показать тост — внутри `act`: новый тост перерисовывает регион. Отдаёт тост;
 * не показан — тест падает здесь.
 */
function show(api: TApi, input: TToastInput<TToastRender>): IToastsItem {
	const shown: { toast?: IToastsItem } = {}

	act(() => {
		shown.toast = api.show(input)
	})

	if (!shown.toast) throw new Error('тоста нет')

	return shown.toast
}

/** Своё содержимое тоста — кнопка, которая называет тост и закрывает его. */
function Undo({ toast }: { toast: IToastsItem }): ReactElement {
	return (
		<button className="so-test-undo" data-uid={String(toast.uid)} onClick={() => toast.close()}>
			Отменить
		</button>
	)
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

		show(api, 'Сохранено')
		show(api, { text: 'Отправлено', description: 'Письмо ушло' })

		expect(texts()).toEqual(['Отправлено', 'Сохранено'])
		expect(node('.so-toasts-item__description', toasts()[0]).textContent).toBe('Письмо ушло')
	})

	it('useToasts() без менеджера выше — ошибка', () => {
		function Orphan(): null {
			useToasts()

			return null
		}

		expect(() => mount(<Orphan />)).toThrow(/<Toasts>/)
	})

	it('предел видимых: показаны первые max, остальные ждут', () => {
		const { api } = render({ max: 2 })

		show(api, 'Первый')
		show(api, 'Второй')
		show(api, 'Третий')

		expect(texts()).toEqual(['Третий', 'Второй'])
	})

	it('приложение рисуется и без региона', () => {
		const { api } = render({ rendered: false })

		show(api, 'Сохранено')

		expect(node('.so-test-app').textContent).toBe('Приложение')
		expect(document.querySelector('.so-toasts')).toBeNull()
	})

	it('ref потребителя — регион', () => {
		const nodes: (Element | null)[] = []

		render({ ref: (element) => void nodes.push(element) })

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

		mounted.render(<></>)
		render({ layout: 'cascade' })

		expect(region().classList.contains('so-toasts--layout-cascade')).toBe(true)
		expect(region().classList.contains('so-toasts--layout-list')).toBe(false)
	})

	/**
	 * Тосты — экземпляры, и ключ узла — `uid` тоста: перестановка переносит
	 * узлы, а не рисует их заново. Узлы сверяются по ссылке: `toEqual` сравнил
	 * бы их по разметке.
	 */
	it('глубина — место в составе; перестановка меняет порядок узлов и глубину, узлы те же', () => {
		const engine = createEngineToasts()
		const { api } = render({ engine, layout: 'cascade' })
		const oldest = show(api, 'Первый')

		show(api, 'Второй')
		show(api, 'Третий')

		expect(texts()).toEqual(['Третий', 'Второй', 'Первый'])
		expect(depths()).toEqual(['0', '1', '2'])

		const [third, second, first] = toasts()

		act(() => {
			engine.extensions.plain.move(oldest, 0)
		})

		expect(texts()).toEqual(['Первый', 'Третий', 'Второй'])
		expect(depths()).toEqual(['0', '1', '2'])

		const moved = toasts()

		expect(moved[0]).toBe(first)
		expect(moved[1]).toBe(third)
		expect(moved[2]).toBe(second)
	})

	/**
	 * Глубина — переменная, а не CSS-свойство `order`: порядок узлов и есть
	 * порядок коллекции. Состояние тоста несёт `order` фасада, и раскладка корня
	 * поставила бы его свойством, отдай ей тост состояние целиком.
	 */
	it('своего свойства order у тоста нет', () => {
		const { api } = render({ layout: 'cascade' })

		show(api, 'Первый')
		show(api, 'Второй')

		expect(toasts().map((toast) => toast.style.order)).toEqual(['', ''])
	})

	it('колесо над стопкой листает её: передний уходит назад', async () => {
		const { api } = render({ layout: 'cascade' })

		show(api, 'Первый')
		show(api, 'Второй')
		// Слушатели стопки встают на регион с его узлом — кадром позже
		await nextFrame()

		const event = new WheelEvent('wheel', { deltaY: 100, bubbles: true, cancelable: true })

		act(() => {
			toasts()[0]?.dispatchEvent(event)
		})

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

		mount(
			<Toasts engine={engine}>
				<ListBox.Item value="a" text="Пункт" />
			</Toasts>,
		)

		expect(node('.so-list-box-item').textContent).toContain('Пункт')
		expect(engine.extensions.batch.items).toEqual([])
		expect(toasts()).toEqual([])
	})

	it('пункт в своём ListBox под менеджером входит в ListBox', () => {
		const engine = createEngineToasts()
		const list = createEngineListBox()

		mount(
			<Toasts engine={engine}>
				<ListBox engine={list}>
					<ListBox.Item value="a" text="Пункт" />
				</ListBox>
			</Toasts>,
		)

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

		act(() => {
			engine.extensions.toasts.show('Из кода')
		})

		expect(texts()).toEqual(['Из кода'])
	})
})

describe('Toasts · закрытие', () => {
	it('крестик закрывает тост: data-open="false", а после переходов он уходит', async () => {
		const { api } = render()
		const toast = show(api, 'Сохранено')

		act(() => node('.so-toasts-item__close').click())

		expect(toast.open).toBe(false)
		expect(toasts()[0]?.dataset.open).toBe('false')

		// Переходов в jsdom нет — тост уходит тем же кадром
		await nextFrame()

		expect(toasts()).toEqual([])
	})

	it('закрытие из кода — тот же путь', async () => {
		const { api } = render()
		const toast = show(api, 'Сохранено')

		act(() => toast.close())
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
		const toast = show(api, { text: 'Удалено', render: Undo })
		const undo = node('.so-toasts-item__content .so-test-undo')

		expect(undo.textContent).toBe('Отменить')
		expect(undo.dataset.uid).toBe(String(toast.uid))

		act(() => undo.click())

		expect(toast.open).toBe(false)
	})

	it('смена render у тоста рисует новое содержимое', () => {
		const First: TToastRender = () => <em className="so-test-first">Первое</em>
		const Second: TToastRender = () => <em className="so-test-second">Второе</em>
		const { api } = render()
		const toast = show(api, { text: 'Готово', render: First })

		expect(node('.so-toasts-item__content .so-test-first')).toBeTruthy()

		act(() => {
			toast.render = Second
		})

		expect(document.querySelector('.so-test-first')).toBeNull()
		expect(node('.so-toasts-item__content .so-test-second')).toBeTruthy()
	})

	it('без render часть содержимого пуста', () => {
		const { api } = render()

		show(api, 'Сохранено')

		expect(node('.so-toasts-item__content').childNodes).toHaveLength(0)
	})

	/**
	 * Ядро держит `render` как `unknown`, и не компонент разметка не рисует.
	 * Чужое значение приходит кодом вне компонентов — у API движка тип `render`
	 * не сужен.
	 */
	it('render — не компонент: часть содержимого пуста', () => {
		const engine = createEngineToasts()

		render({ engine })
		act(() => {
			engine.extensions.toasts.show({ text: 'Сохранено', render: { component: 'нет' } })
		})

		expect(node('.so-toasts-item__content').childNodes).toHaveLength(0)
	})

	it('без описания часть описания пуста, а текст — нет', () => {
		const { api } = render()

		show(api, 'Сохранено')

		expect(node('.so-toasts-item__description').childNodes).toHaveLength(0)
		expect(node('.so-toasts-item__text').textContent).toBe('Сохранено')
	})
})

describe('Toasts · слоты', () => {
	it('item — текст со scope { item, text }, item-content — своё содержимое', () => {
		const { api } = render({
			item: (scope) => (
				<strong className="so-test-text" data-uid={String(scope.item.uid)}>
					{scope.text}!
				</strong>
			),
			'item-content': (scope) => <span className="so-test-content">{scope.item.text}</span>,
		})
		const toast = show(api, 'Сохранено')

		expect(node('.so-test-text').textContent).toBe('Сохранено!')
		expect(node('.so-test-text').dataset.uid).toBe(String(toast.uid))
		expect(node('.so-toasts-item__content .so-test-content').textContent).toBe('Сохранено')
	})

	it('смена текста доходит до слота item тем же узлом', () => {
		const { api } = render({
			item: (scope) => <strong className="so-test-text">{scope.text}!</strong>,
		})
		const toast = show(api, 'Сохраняем…')
		const text = node('.so-test-text')

		act(() => {
			toast.text = 'Сохранено'
		})

		expect(node('.so-test-text')).toBe(text)
		expect(text.textContent).toBe('Сохранено!')
	})

	it('item-close-icon подменяет иконку крестика', () => {
		const { api } = render({ 'item-close-icon': () => <i className="so-test-x" /> })

		show(api, 'Сохранено')

		expect(node('.so-toasts-item__close .so-test-x')).toBeTruthy()
		expect(node('.so-toasts-item__close').querySelector('svg')).toBeNull()
	})

	/** Слот менеджера, вернувший пустое, уступает место своему — тексту тоста. */
	it('пустой item уступает место тексту тоста', () => {
		const { api } = render({ item: () => null })

		show(api, 'Сохранено')

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

	it('значки пяти видов разные: в принудительных цветах вид различает только глиф', () => {
		const roles: TIconRole[] = ['notification', 'info', 'success', 'warning', 'error']

		expect(new Set(roles.map(bodyOf)).size).toBe(roles.length)
	})

	it('смена вида меняет значок, снятый вид возвращает значок обычного сообщения', () => {
		const { api } = render()
		const toast = show(api, 'Сохраняем…')

		act(() => {
			toast.type = 'success'
		})

		expect(glyph()).toBe(bodyOf('success'))

		act(() => {
			toast.type = undefined
		})

		expect(glyph()).toBe(bodyOf('notification'))
	})

	it('item-icon подменяет значок и получает { item, type }; смена вида доходит до слота тем же узлом', () => {
		const { api } = render({
			'item-icon': (scope) => (
				<i
					className="so-test-icon"
					data-uid={String(scope.item.uid)}
					data-type={scope.type}
				/>
			),
		})
		const toast = show(api, { text: 'Нет сети', type: 'error' })
		const icon = node('.so-test-icon', iconBox())

		expect(iconBox().children).toHaveLength(1)
		expect(icon.dataset.uid).toBe(String(toast.uid))
		expect(icon.dataset.type).toBe('error')

		act(() => {
			toast.type = 'success'
		})

		expect(node('.so-test-icon', iconBox())).toBe(icon)
		expect(icon.dataset.type).toBe('success')
	})

	/**
	 * Пустое, что вернул слот менеджера, тост видит (`renderSlot`) и рисует свой
	 * значок вида — как пустые слоты-иконки у элементов коллекций и как у Vue.
	 */
	it('пустой item-icon уступает место значку вида', () => {
		const { api } = render({ 'item-icon': () => null })

		show(api, { text: 'Место почти закончилось', type: 'warning' })

		expect(glyph()).toBe(bodyOf('warning'))
	})

	/** Слот решает по scope, рисовать ли своё: пустое у одного вида уступает значку вида. */
	it('item-icon только для ошибки: у остальных — значок вида', () => {
		const { api } = render({
			'item-icon': (scope) =>
				scope.type === 'error' ? <i className="so-test-icon" /> : null,
		})
		const toast = show(api, { text: 'Нет сети', type: 'error' })

		expect(node('.so-test-icon', iconBox())).toBeTruthy()

		act(() => {
			toast.type = 'warning'
		})

		expect(glyph()).toBe(bodyOf('warning'))
	})

	it('пока тост ждёт — в коробке одно бегущее кольцо; снятое ожидание возвращает значок', () => {
		const { api } = render()
		const toast = show(api, { text: 'Сохраняем…', loading: true })
		const [ring, ...rest] = iconBox().children

		expect(rest).toEqual([])
		expect(ring?.classList.contains('so-progress-spinner')).toBe(true)
		expect(ring?.getAttribute('data-indeterminate')).toBe('true')

		act(() => {
			toast.loading = false
			toast.type = 'success'
		})

		expect(glyph()).toBe(bodyOf('success'))
	})

	it('кольцо встаёт и на место своего значка из item-icon', () => {
		const { api } = render({ 'item-icon': () => <i className="so-test-icon" /> })
		const toast = show(api, { text: 'Отправляем…', type: 'info', loading: true })

		expect(iconBox().querySelector('.so-test-icon')).toBeNull()
		expect(iconBox().querySelectorAll('.so-progress-spinner')).toHaveLength(1)

		act(() => {
			toast.loading = false
		})

		expect(iconBox().querySelector('.so-progress-spinner')).toBeNull()
		expect(node('.so-test-icon', iconBox())).toBeTruthy()
	})
})

describe('Toasts · ARIA', () => {
	it('регион — region с живой областью и именем от локали', () => {
		mount(
			<LocaleProvider locale={ruRU}>
				<Toasts>
					<main>Приложение</main>
				</Toasts>
			</LocaleProvider>,
		)

		expect(region().getAttribute('role')).toBe('region')
		expect(region().getAttribute('aria-live')).toBe('polite')
		expect(region().getAttribute('aria-label')).toBe('Уведомления (F8)')
		expect(region().dataset.layer).toBeDefined()
	})

	it('тост — status, срочный — alert; фокусируемый; крестик назван текстом', () => {
		const { api } = render()

		show(api, 'Сохранено')
		show(api, { text: 'Ошибка сети', alert: true })

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
		render({ className: 'so-test-region', 'data-test': 'toasts' })

		expect(region().classList.contains('so-test-region')).toBe(true)
		expect(region().dataset.test).toBe('toasts')
	})
})

/** Своё содержимое тоста объектом-компонентом `memo`. */
const MemoUndo = memo(Undo)

/** Своё содержимое тоста объектом-компонентом `forwardRef`. */
const RefUndo = forwardRef<HTMLButtonElement, { toast: IToastsItem }>(function RefUndo(
	{ toast },
	ref,
) {
	return (
		<button ref={ref} className="so-test-undo" data-uid={String(toast.uid)}>
			Отменить
		</button>
	)
})

/** Своё содержимое тоста классом-компонентом. */
class ClassUndo extends Component<{ toast: IToastsItem }> {
	override render(): ReactElement {
		return <Undo toast={this.props.toast} />
	}
}

/**
 * Своё у React: лифт — контекст, которого портал не теряет; API — значение
 * контекста, новое у пересобранного менеджера; своё содержимое — любой
 * компонент React; портала нет на сервере.
 */
describe('React', () => {
	/** Своей разметки вокруг приложения у менеджера нет: регион — в цели телепорта. */
	it('рядом с приложением — ни обёртки, ни региона', () => {
		const { mounted } = render()

		expect([...mounted.container.children].map((child) => child.localName)).toEqual(['main'])
		expect(mounted.container.contains(region())).toBe(false)
	})

	/**
	 * Лишний цикл эффектов StrictMode уничтожает первую сборку менеджера вместе
	 * с движком, и пересобранный менеджер отдаёт новый API. Эффект монтирования
	 * с `show` в зависимостях показывает тост и в нём: тост, показанный прежним
	 * `show`, остался в движке, которого на экране нет. Клик берёт `show`
	 * последнего рендера.
	 */
	it('StrictMode: регион один, эффект монтирования с [show] и клик дают по одному тосту', async () => {
		const apis = new Set<TApi>()

		function App(): ReactElement {
			const api = useToasts()
			const { show } = api

			apis.add(api)

			useEffect(() => {
				show('При монтировании')
			}, [show])

			return (
				<button className="so-test-show" onClick={() => show('По клику')}>
					Показать
				</button>
			)
		}

		mount(
			<StrictMode>
				<Toasts>
					<App />
				</Toasts>
			</StrictMode>,
		)
		await nextFrame()

		expect(apis.size).toBe(2)
		expect(document.querySelectorAll('.so-toasts')).toHaveLength(1)
		expect(texts()).toEqual(['При монтировании'])

		act(() => node('.so-test-show').click())

		expect(texts()).toEqual(['По клику', 'При монтировании'])
	})

	it('между перерисовками менеджера API — тот же объект', () => {
		const apis: TApi[] = []

		function App({ label }: { label: string }): ReactElement {
			apis.push(useToasts())

			return <main>{label}</main>
		}

		const { render: rerender } = mount(
			<Toasts>
				<App label="Первый" />
			</Toasts>,
		)

		rerender(
			<Toasts max={2}>
				<App label="Второй" />
			</Toasts>,
		)

		expect(apis.length).toBeGreaterThan(1)
		expect(new Set(apis).size).toBe(1)
	})

	/**
	 * Окно рисует содержимое порталом, а портал React контекст сохраняет:
	 * компонент в окне под менеджером видит слой менеджера и берёт API, как
	 * приложение.
	 */
	it('useToasts() в содержимом окна под менеджером находит API', () => {
		const taken: { api?: TApi } = {}

		function Inside(): ReactElement {
			taken.api = useToasts()

			return <button className="so-test-inside">В окне</button>
		}

		mount(
			<Toasts>
				<Dialog visible>
					<Inside />
				</Dialog>
			</Toasts>,
		)

		const api = taken.api

		expect(node('.so-dialog').contains(node('.so-test-inside'))).toBe(true)

		if (!api) throw new Error('useToasts() в окне не позвали')

		show(api, 'Из окна')

		expect(texts()).toEqual(['Из окна'])
	})

	/**
	 * Компонент React — не только функция: `memo`, `forwardRef` и класс тоже
	 * компоненты, и `TToastRender` их пускает. Проверка `render` их узнаёт, и
	 * тост рисует каждый, со своим пропом.
	 */
	it.each<[string, TToastRender]>([
		['memo', MemoUndo],
		['forwardRef', RefUndo],
		['класс', ClassUndo],
	])('render — %s: рисуется и получает тост', (_name, content) => {
		const { api } = render()
		const toast = show(api, { text: 'Удалено', render: content })

		expect(node('.so-toasts-item__content .so-test-undo').dataset.uid).toBe(String(toast.uid))
	})

	/**
	 * Готовый элемент — не компонент: пропа `toast` он не получит. Приходит он
	 * кодом вне компонентов — у API движка тип `render` не сужен, — и часть
	 * содержимого остаётся пустой.
	 */
	it('render — готовый элемент: часть содержимого пуста', () => {
		const engine = createEngineToasts()

		render({ engine })
		act(() => {
			engine.extensions.toasts.show({
				text: 'Удалено',
				render: <i className="so-test-element" />,
			})
		})

		expect(node('.so-toasts-item__content').childNodes).toHaveLength(0)
		expect(document.querySelector('.so-test-element')).toBeNull()
	})

	/**
	 * Компонент — функция, класс или объект-компонент; готовый элемент, строка
	 * тега и чужой объект — нет. `lazy` рисуется только под `Suspense`, поэтому
	 * он — только здесь.
	 */
	it.each<[string, boolean, unknown]>([
		['функция', true, Undo],
		['класс', true, ClassUndo],
		['memo', true, MemoUndo],
		['forwardRef', true, RefUndo],
		['lazy', true, lazy(async () => ({ default: Undo }))],
		['готовый элемент', false, <i />],
		['строка', false, 'button'],
		['объект', false, { component: 'нет' }],
		['null', false, null],
	])('isToastRender: %s — %s', (_name, expected, value) => {
		expect(isToastRender(value)).toBe(expected)
	})

	it('снятый менеджер уносит регион из цели', () => {
		const { api, mounted } = render()

		show(api, 'Сохранено')
		mounted.render(<></>)

		expect(document.querySelector('.so-toasts')).toBeNull()
		expect(toasts()).toEqual([])
	})

	/**
	 * Портал React серверный рендер не поддерживает, и регион — в портале: на
	 * сервере менеджер рисует только приложение. После гидратации регион встаёт
	 * в цель, а API, взятое при гидратации, показывает в нём тост.
	 */
	it('сервер — приложение без региона; гидратация без расхождений, регион после неё — в цели', () => {
		const taken: { api?: TApi } = {}

		function App(): ReactElement {
			taken.api = useToasts()

			return <main className="so-test-app">Приложение</main>
		}

		const element = (
			<Toasts>
				<App />
			</Toasts>
		)
		const markup = renderToString(element)

		expect(markup).toBe('<main class="so-test-app">Приложение</main>')

		const container = document.createElement('div')
		const onRecoverableError = vi.fn()

		container.innerHTML = markup
		document.body.append(container)

		act(() => {
			track(hydrateRoot(container, element, { onRecoverableError }))
		})

		expect(onRecoverableError).not.toHaveBeenCalled()
		expect(document.body.contains(region())).toBe(true)
		expect(container.contains(region())).toBe(false)

		const api = taken.api

		if (!api) throw new Error('useToasts() не позвали')

		show(api, 'После гидратации')

		expect(texts()).toEqual(['После гидратации'])
	})
})
