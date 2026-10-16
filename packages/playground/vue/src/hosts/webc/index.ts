import { enUS, type TLocale } from '@soldy-ui/plugins'
import { DEFAULT_SLOT } from '@soldy-ui/setup'
import { TLocaleProviderElement, isHostProp, toAttributeName } from '@soldy-ui/webc'
import { findComponent, type IPreviewHost } from '@soldy-ui/playground-shared'
import { FIXTURES } from './fixtures'
import { PREVIEWS, type TPreview } from './previews'
import { listenersOf, type TElementListener } from './events'
import { instanceSnippet, propSnippet } from './snippet'

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
 * Пропсы, которые элемент получает свойствами: пропсы превью, поверх — пропсы
 * строки. `ctrl` среди них нет — он ставится до вставки (см. `build`), — как
 * и пропов, которых у элемента нет вовсе (`tag`: тег — сам элемент).
 */
function propsOf(preview: TPreview, bind: Readonly<Record<string, unknown>>): Map<string, unknown> {
	return new Map(
		Object.entries({ ...preview.props, ...bind }).filter(
			([name]) => name !== 'ctrl' && !isHostProp(name),
		),
	)
}

/**
 * Элемент компонента — кодом, как его строит потребитель. Всё, что элемент
 * получает до вставки, применит его первая сборка, а `ctrl` — только до
 * вставки: инстанс, присвоенный подключённому элементу, достанется лишь
 * следующей сборке, после перестановки.
 */
function build(
	preview: TPreview,
	bind: Readonly<Record<string, unknown>>,
	listeners: readonly TElementListener[],
): HTMLElement {
	const element = document.createElement(preview.tag, { is: preview.is })

	if (bind.ctrl !== undefined) Reflect.set(element, 'ctrl', bind.ctrl)

	fill(element, preview, propsOf(preview, bind))

	for (const { type, listener } of listeners) element.addEventListener(type, listener)

	return element
}

/**
 * Описание на элементе: свои атрибуты — атрибутами, как в разметке, пропсы —
 * свойствами, а дети по слотам — светом, с атрибутом `slot` (у слота по
 * умолчанию его нет). Всё — до вставки: первая сборка разложит свет по
 * слотам. Ребёнок получает своё описание тем же путём, без пропсов строки.
 */
function fill(element: HTMLElement, preview: TPreview, props: Map<string, unknown>): void {
	for (const [name, value] of Object.entries(preview.attributes ?? {})) {
		element.setAttribute(toAttributeName(name), value)
	}

	for (const [name, value] of props) {
		if (value !== undefined) Reflect.set(element, name, value)
	}

	for (const [slot, children] of Object.entries(preview.slots ?? {})) {
		for (const child of children) {
			const node = document.createElement(child.tag, { is: child.is })

			fill(node, child, propsOf(child, {}))

			if (slot !== DEFAULT_SLOT) node.setAttribute('slot', slot)

			element.appendChild(node)
		}
	}
}

/**
 * Новые пропсы — свойствами, только сменившиеся: как полный набор пропсов у
 * остальных фреймворков, повтор прежнего значения не откатывает то, что с тех
 * пор поменяли ядро или код через инстанс. Снятый проп — `undefined`: связка
 * вернёт его к умолчанию декларации.
 */
function write(element: HTMLElement, before: Map<string, unknown>, after: Map<string, unknown>) {
	for (const [name, value] of after) {
		if (!before.has(name) || before.get(name) !== value) Reflect.set(element, name, value)
	}

	for (const name of before.keys()) {
		if (!after.has(name)) Reflect.set(element, name, undefined)
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
 * атрибуты — атрибутами, содержимое слотов фикстуры — детьми, слушатели — по
 * поверхности дескриптора (`listenersOf`). Смена `ctrl` пересоздаёт элемент:
 * присвоенный подключённому, он дошёл бы до ядра лишь при следующем
 * подключении.
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

	mount(node, { component, fixture, props, onEvent }) {
		const preview = drawing(component, fixture)
		const entry = findComponent(component)
		const listeners = entry && onEvent ? listenersOf(entry, onEvent) : []
		const root = new TLocaleProviderElement()

		root.locale = locale
		node.appendChild(root)
		roots.add(root)

		let bind = props
		let element = build(preview, bind, listeners)

		root.appendChild(element)

		return {
			update(next) {
				if (next.ctrl !== bind.ctrl) {
					element.remove()
					element = build(preview, next, listeners)
					root.appendChild(element)
				} else {
					write(element, propsOf(preview, bind), propsOf(preview, next))
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
