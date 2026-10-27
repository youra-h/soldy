import { enUS, type TLocale } from '@soldy-ui/plugins'
import { DEFAULT_SLOT } from '@soldy-ui/setup'
import { TLocaleProviderElement, isHostProp, toAttributeName } from '@soldy-ui/webc'
import {
	componentDescriptors,
	findComponent,
	partsOf,
	type IPreviewHost,
} from '@soldy-ui/playground-shared'
import { FIXTURES } from './fixtures'
import { PREVIEWS, type TContent, type TPreview, type TPreviewProps } from './previews'
import { listenersOf, type TElementListener } from './events'
import { instanceSnippet, propSnippet } from './snippet'

/** Listeners of the preview's parts, by part name (`partsOf`). */
type TParts = Readonly<Record<string, readonly TElementListener[]>>

/** Язык шапки — один на все корни хоста. */
let locale: TLocale = enUS

/** Живые корни хоста: смена языка пишется в каждый. */
const roots = new Set<TLocaleProviderElement>()

/** Чем рисовать: фикстура по ключу, без ключа — превью компонента. */
function drawing(component: string, fixture: string | undefined): TPreview {
	const found = fixture === undefined ? PREVIEWS[component] : FIXTURES[fixture]

	if (!found) {
		throw new Error(
			`[playground] хост Web Components не умеет рисовать «${fixture ?? component}»`,
		)
	}

	return found
}

/**
 * Пропсы, которые элемент получает свойствами: пропсы описания — у
 * компонента превью выведенные из пропсов строки, — поверх — то, что отдала
 * оболочка (у компонента превью — пропсы превью и строки). `ctrl` среди них
 * нет — он ставится до вставки (см. `build`), — как и пропов, которых у
 * элемента нет вовсе (`tag`: тег — сам элемент).
 */
function propsOf(preview: TPreview, bind: TPreviewProps): Map<string, unknown> {
	const own = typeof preview.props === 'function' ? preview.props(bind) : preview.props

	return new Map(
		Object.entries({ ...own, ...bind }).filter(
			([name]) => name !== 'ctrl' && !isHostProp(name),
		),
	)
}

/**
 * Элемент описания: встроенный элемент soldy — тегом с `is`, автономный и
 * обёртка без компонента — одним тегом.
 */
function elementOf(preview: TPreview): HTMLElement {
	return preview.is === undefined
		? document.createElement(preview.tag)
		: document.createElement(preview.tag, { is: preview.is })
}

/**
 * Что построил хост: элемент компонента и узел, который встаёт в корень, —
 * обёртку с компонентом в её слоте по умолчанию или сам компонент.
 */
type TBuilt = {
	readonly element: HTMLElement
	readonly outer: HTMLElement
}

/**
 * Элемент компонента — кодом, как его строит потребитель. Всё, что элемент
 * получает до вставки, применит его первая сборка, а `ctrl` — только до
 * вставки: инстанс, присвоенный подключённому элементу, достанется лишь
 * следующей сборке, после перестановки. Обёртка (`TPreview.wrapper`) — тем же
 * путём, со своими пропсами описания и стилем от пропсов строки, а компонент
 * — её светом, в слоте по умолчанию, следом за кнопкой, которая его
 * открывает (`TPreview.opener`).
 */
function build(
	preview: TPreview,
	bind: TPreviewProps,
	listeners: readonly TElementListener[],
	parts: TParts,
): TBuilt {
	const element = elementOf(preview)

	if (bind.ctrl !== undefined) Reflect.set(element, 'ctrl', bind.ctrl)

	fill(element, preview, propsOf(preview, bind), bind, parts)

	for (const { type, listener } of listeners) element.addEventListener(type, listener)

	const { wrapper, opener } = preview

	if (!wrapper) {
		if (opener !== undefined) {
			throw new Error('[playground] кнопке, которая открывает компонент, нужна обёртка')
		}

		return { element, outer: element }
	}

	const outer = elementOf(wrapper)

	fill(outer, wrapper, propsOf(wrapper, {}), {}, parts)
	applyStyle(outer, wrapper, bind)

	if (opener !== undefined) outer.appendChild(openerOf(opener, element))

	outer.appendChild(element)

	return { element, outer }
}

/**
 * Кнопка, которая открывает компонент (`TPreview.opener`): Button с подписью,
 * а нажатие пишет компоненту `visible = true` — как кнопка превью Vue своё
 * состояние `v-model:visible`. Закрывает компонент он сам — крестиком,
 * подложкой, Escape, — а строка `visible` страницы задаёт открытость снаружи.
 */
function openerOf(text: string, element: HTMLElement): HTMLElement {
	const button = document.createElement('button', { is: 'so-button' })

	Reflect.set(button, 'text', text)
	button.addEventListener('click', () => Reflect.set(element, 'visible', true))

	return button
}

/**
 * Стиль элемента без компонента (`TPreview.style`): обёртке — от пропсов строки
 * компонента, ребёнку в слоте — без них. Нет его — не трогается.
 */
function applyStyle(element: HTMLElement, preview: TPreview, bind: TPreviewProps): void {
	if (preview.style) element.style.cssText = preview.style(bind)
}

/**
 * A child in a slot. A soldy element and markup without a component with its
 * own content (the row of the DragAndDrop preview) are built by their
 * description — the same way as the wrapper, with the style, but without the
 * row's props; markup without content — by its function. A part
 * (`TPreview.part`) gets its listeners before insertion, as the component.
 */
function childOf(child: TContent, parts: TParts): Node {
	if (typeof child === 'function') return child()

	const node = elementOf(child)

	fill(node, child, propsOf(child, {}), {}, parts)
	applyStyle(node, child, {})

	for (const { type, listener } of child.part === undefined ? [] : (parts[child.part] ?? [])) {
		node.addEventListener(type, listener)
	}

	return node
}

/**
 * Описание на элементе: свои атрибуты — атрибутами, как в разметке, пропсы —
 * свойствами, а дети по слотам — светом, элемент — с атрибутом `slot` (у слота
 * по умолчанию его нет). Всё — до вставки: первая сборка разложит свет по
 * слотам, и элементы коллекции соберутся следом за владельцем. Дети, которые
 * зависят от пропсов строки (`TPreview.slots` функцией), — по `bind`.
 */
function fill(
	element: HTMLElement,
	preview: TPreview,
	props: Map<string, unknown>,
	bind: TPreviewProps,
	parts: TParts,
): void {
	for (const [name, value] of Object.entries(preview.attributes ?? {})) {
		element.setAttribute(toAttributeName(name), value)
	}

	for (const [name, value] of props) {
		if (value !== undefined) Reflect.set(element, name, value)
	}

	const slots = typeof preview.slots === 'function' ? preview.slots(bind) : preview.slots

	for (const [slot, children] of Object.entries(slots ?? {})) {
		for (const child of children) {
			const node = childOf(child, parts)

			if (slot !== DEFAULT_SLOT && node instanceof Element) node.setAttribute('slot', slot)

			element.appendChild(node)
		}
	}
}

/**
 * Проп собранному элементу — свойством элемента, как из кода приложения. Проп
 * на нативном строковом свойстве (`id`: у корня с полем атрибут `id` — проп
 * поля) снимается пустой строкой, как у платформы: `undefined` нативный
 * сеттер записал бы строкой `"undefined"`.
 */
function assign(element: HTMLElement, name: string, value: unknown): void {
	const native =
		(Reflect.has(Element.prototype, name) || Reflect.has(HTMLElement.prototype, name)) &&
		typeof Reflect.get(element, name) === 'string'

	Reflect.set(element, name, value === undefined && native ? '' : value)
}

/**
 * Новые пропсы — свойствами, только сменившиеся: как полный набор пропсов у
 * остальных фреймворков, повтор прежнего значения не откатывает то, что с тех
 * пор поменяли ядро или код через инстанс. Снятый проп — `undefined`: связка
 * вернёт его к умолчанию декларации.
 */
function write(element: HTMLElement, before: Map<string, unknown>, after: Map<string, unknown>) {
	for (const [name, value] of after) {
		if (!before.has(name) || before.get(name) !== value) assign(element, name, value)
	}

	for (const name of before.keys()) {
		if (!after.has(name)) assign(element, name, undefined)
	}
}

/**
 * Хост Web Components.
 *
 * Фреймворка нет, и своего корня у превью тоже: корень — `<so-locale-provider>`
 * на узле оболочки. Контекст провайдера оболочки в чужой корень не проходит, и
 * язык шапки корню даёт хост — свойством `locale`, в источник провайдера:
 * компоненты не пересобираются.
 *
 * Элемент компонента строит код (`build`), пропсы уходят ему свойствами, свои
 * атрибуты — атрибутами, содержимое слотов — детьми, слушатели — по
 * поверхности дескриптора (`listenersOf`). Обёртка превью (подпись вокруг
 * флажка) получает только свои пропсы описания. Смена `ctrl` пересоздаёт
 * элемент вместе с обёрткой: присвоенный подключённому, он дошёл бы до ядра
 * лишь при следующем подключении. Так же — смена пропа, от которого зависят
 * дети превью (`TPreview.rebuild`): свет собранного элемента уже разложен.
 *
 * Синхронно: элемент собирается при подключении и раскладывает состояние
 * ядра на себя тем же вызовом, — к возврату из `mount` компонент в DOM, как
 * обещает контракт. Смена пропсов доходит до разметки микрозадачей, к кадру,
 * которого ждёт вызывающий.
 */
const host: IPreviewHost = {
	previews: Object.keys(PREVIEWS),
	fixtures: Object.keys(FIXTURES),
	// Содержимое слота — свет элемента: данных компонента ему не передать
	slotScope: false,
	// Тег корня — сам элемент: его задаёт регистрация, а не проп
	tagProp: false,

	mount(node, { component, fixture, props, onEvent, count = 1 }) {
		const preview = drawing(component, fixture)
		const entry = findComponent(component)
		const listeners = entry && onEvent ? listenersOf(componentDescriptors(entry), onEvent) : []
		// A fixture's markup is its own: its parts are not listened to
		const parts =
			entry && onEvent && fixture === undefined ? partsOf(entry, onEvent, listenersOf) : {}
		const root = new TLocaleProviderElement()

		root.locale = locale
		node.appendChild(root)
		roots.add(root)

		let bind = props
		// Копии — рядом в одном корне (`TPreviewMount.count`)
		const buildAll = (next: TPreviewProps): TBuilt[] =>
			Array.from({ length: count }, () => build(preview, next, listeners, parts))
		let copies = buildAll(bind)

		for (const built of copies) root.appendChild(built.outer)

		return {
			update(next) {
				// Инстанс и движок коллекции элемент берёт сборкой, как `ctrl` и
				// `engine` у остальных фреймворков: другой — значит, другой элемент.
				// Так же — пропсы, от которых зависят дети превью (`rebuild`)
				const rebuilt = (preview.rebuild ?? []).some((name) => next[name] !== bind[name])

				if (next.ctrl !== bind.ctrl || next.engine !== bind.engine || rebuilt) {
					for (const built of copies) built.outer.remove()
					copies = buildAll(next)
					for (const built of copies) root.appendChild(built.outer)
				} else {
					for (const built of copies) {
						write(built.element, propsOf(preview, bind), propsOf(preview, next))

						if (preview.wrapper) applyStyle(built.outer, preview.wrapper, next)
					}
				}

				bind = next
			},
			unmount() {
				roots.delete(root)
				root.remove()
			},
		}
	},

	setLocale(next) {
		locale = next

		for (const root of roots) root.locale = next
	},

	snippets: { extension: 'html', propSnippet, instanceSnippet },
}

export default host
