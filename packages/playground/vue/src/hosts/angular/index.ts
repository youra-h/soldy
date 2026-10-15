import {
	createComponent,
	inputBinding,
	reflectComponentType,
	signal,
	type ComponentRef,
	type DirectiveWithBindings,
	type Type,
	type ViewContainerRef,
} from '@angular/core'
import { createApplication } from '@angular/platform-browser'
import { findComponent, type IPreviewHost } from '@soldy-ui/playground-shared'
import { PREVIEWS } from './previews'
import { FIXTURES } from './fixtures'
import { listen, listenersOf, type TOutputListener } from './events'
import { PreviewRootComponent, language } from './root.component'

/** Пропсы компонента — именами разметки, с `ctrl`. */
type TProps = Readonly<Record<string, unknown>>

/** Компонент в корне: новые пропсы и снятие. */
type TDrawn = {
	write(props: TProps): void
	destroy(): void
}

/** Корень компонента, когда его задаёт превью: свой элемент и директивы на нём. */
type THostOptions = {
	readonly element?: () => Element
	readonly directives?: readonly DirectiveWithBindings<unknown>[]
}

/**
 * Пропсы, которым у компонента Angular нет входа: тег корня — у самого
 * элемента (`<a so-button>`), и входа `tag` адаптер не объявляет. Хост его не
 * пишет, как и хост Web Components.
 */
const ELEMENT_PROPS: ReadonlySet<string> = new Set(['tag'])

/**
 * Приложение хоста — одно на все корни, без Zone.js: адаптер рассчитан на
 * zoneless, состояние компонентов — сигналы. Одно, а не своё на корень: id
 * монтирования — номер сборки в приложении (`ng-1`, `ng-2`), и у двух
 * приложений на одной странице id частей совпали бы.
 */
const app = await createApplication()

/**
 * Компонент — в место корня, со связками входов, как его ставит шаблон.
 *
 * Связка (`inputBinding`) стоит на каждом входе компонента и читает пропсы из
 * сигнала: смена пропсов — новое значение сигнала, а снятый проп связка отдаёт
 * входу как `undefined`, и сборка ядра возвращает свойство к умолчанию
 * декларации. Не `setInput` по пришедшим именам: в компонент с директивой со
 * связками — иконку по роли — Angular его не пускает. Проп без входа —
 * расхождение адаптера с дескриптором, и хост его не глушит.
 */
function insert<T extends object>(
	outlet: ViewContainerRef,
	component: Type<T>,
	props: TProps,
	host: THostOptions = {},
): { ref: ComponentRef<T>; write: (props: TProps) => void } {
	const inputs = new Set(
		(reflectComponentType(component)?.inputs ?? []).map(({ templateName }) => templateName),
	)
	const checked = (next: TProps): TProps => {
		const unknown = Object.keys(next).filter(
			(name) => !inputs.has(name) && !ELEMENT_PROPS.has(name),
		)

		if (unknown.length > 0) {
			throw new Error(`[playground] у ${component.name} нет входов: ${unknown.join(', ')}`)
		}

		return next
	}
	const current = signal(checked(props))
	const ref = createComponent(component, {
		environmentInjector: app.injector,
		elementInjector: outlet.injector,
		hostElement: host.element?.(),
		directives: [...(host.directives ?? [])],
		bindings: [...inputs].map((name) => inputBinding(name, () => current()[name])),
	})

	outlet.insert(ref.hostView)

	return { ref, write: (next) => current.set(checked(next)) }
}

/** Превью: компонент адаптера по описанию карты; слушают его выходы. */
function drawPreview(
	outlet: ViewContainerRef,
	component: string,
	props: TProps,
	listeners: readonly TOutputListener[],
): TDrawn {
	const preview = PREVIEWS[component]

	if (!preview) throw new Error(`[playground] хост Angular не умеет рисовать «${component}»`)

	// Пропсы превью — под пропсами строки
	const { ref, write } = insert(
		outlet,
		preview.component,
		{ ...preview.props, ...props },
		preview,
	)
	const unlisten = listen(ref.instance, listeners)

	return {
		write: (next) => write({ ...preview.props, ...next }),
		destroy() {
			unlisten()
			ref.destroy()
		},
	}
}

/** Фикстура: свой компонент с разметкой слотов; слушают выходы компонента сценария в ней. */
function drawFixture(
	outlet: ViewContainerRef,
	fixture: string,
	props: TProps,
	listeners: readonly TOutputListener[],
): TDrawn {
	const type = FIXTURES[fixture]

	if (!type) throw new Error(`[playground] хост Angular не умеет рисовать «${fixture}»`)

	const { ref, write } = insert(outlet, type, props)
	const unlisten = listen(ref.instance.target(), listeners)

	return {
		write,
		destroy() {
			unlisten()
			ref.destroy()
		},
	}
}

/**
 * Хост Angular.
 *
 * Превью — свой корень (`PreviewRootComponent`) на узле оболочки, в нём
 * `so-locale-provider`: контекст оболочки в чужой корень не проходит, и язык
 * шапки корню даёт хост. Компонент в корень тоже ставит хост (`insert`):
 * пропсы приходят именами разметки, а привязки шаблона Angular перечисляет
 * поимённо.
 *
 * Состояние компонентов приложение проверяет само, на своём такте. А `mount`,
 * `update` и `setLocale` заканчиваются проверкой тем же вызовом
 * (`app.tick()`), как `flushSync` у React: контракт обещает компонент в DOM к
 * возврату, а пропсы и язык оболочка меняет из своих наблюдателей, вне такта
 * Angular.
 *
 * Смена `ctrl` ставит компонент заново: экземпляр ядра адаптер берёт при
 * сборке, а не на лету.
 */
const host: IPreviewHost = {
	previews: Object.keys(PREVIEWS),
	fixtures: Object.keys(FIXTURES),

	mount(node, { component, fixture, props, onEvent }) {
		const entry = findComponent(component)
		const listeners = entry && onEvent ? listenersOf(entry, onEvent) : []
		const root = createComponent(PreviewRootComponent, { environmentInjector: app.injector })
		const element: Element = root.location.nativeElement
		const outlet = root.instance.outlet()
		const draw = (next: TProps): TDrawn =>
			fixture === undefined
				? drawPreview(outlet, component, next, listeners)
				: drawFixture(outlet, fixture, next, listeners)

		let bind = props
		let drawn: TDrawn

		// Корень — в документ и в приложение, когда в нём есть что рисовать:
		// превью нет или проп без входа — узел оболочки остаётся пустым
		try {
			drawn = draw(bind)
		} catch (error) {
			root.destroy()
			throw error
		}

		node.appendChild(element)
		app.attachView(root.hostView)
		app.tick()

		return {
			update(next) {
				if (next.ctrl === bind.ctrl) {
					drawn.write(next)
				} else {
					const replaced = drawn

					drawn = draw(next)
					replaced.destroy()
				}

				bind = next
				app.tick()
			},
			unmount() {
				drawn.destroy()
				root.destroy()
				element.remove()
			},
		}
	},

	setLocale(next) {
		language.set(next)
		app.tick()
	},
}

export default host
