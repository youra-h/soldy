import {
	createComponent,
	inputBinding,
	reflectComponentType,
	signal,
	type ComponentRef,
	type DirectiveWithBindings,
	type Injector,
	type Type,
	type ViewContainerRef,
	type ViewRef,
} from '@angular/core'
import { createApplication } from '@angular/platform-browser'
import { provideAttrs } from '@soldy-ui/angular'
import { findComponent, type IPreviewHost } from '@soldy-ui/playground-shared'
import {
	PREVIEWS,
	type TComponentPreview,
	type TContent,
	type TPart,
	type TProps,
} from './previews'
import { FIXTURES, type TFixture } from './fixtures'
import { listen, listenersOf, type TOutputListener } from './events'
import { PreviewFrameComponent } from './frame.component'
import { PreviewRootComponent, language } from './root.component'

/** Компонент в корне: новые пропсы и снятие. */
type TDrawn = {
	write(props: TProps): void
	destroy(): void
}

/**
 * Где собрать компонент: чей инжектор у сборки, на каком элементе и куда
 * встаёт его представление.
 */
type TPlace = {
	/**
	 * Инжектор места. Через него сборка видит провайдер локали корня, а часть
	 * коллекции — ещё и слой лифта своего владельца.
	 */
	readonly injector: Injector
	/** Готовый элемент компонента; нет — элемент строит Angular по селектору. */
	readonly element?: Element
	/** Поставить представление компонента туда, где его проверяет приложение. */
	readonly attach: (view: ViewRef) => void
}

/** Как собрать компонент: директивы на корне и узлы его проекций. */
type TInsertOptions = {
	readonly directives?: readonly DirectiveWithBindings<unknown>[]
	readonly projected?: Node[][]
}

/** Узел содержимого: элемент части, на котором она соберётся, или разметка. */
type TContentNode =
	| { readonly node: Node; readonly part?: undefined }
	| { readonly node: Element; readonly part: TPart }

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
 * приложений на одной странице id частей совпали бы. Рендерер адаптера
 * (`provideAttrs()`) подключён, как в `appConfig` приложения: без него поля и
 * коллекции не собираются.
 */
const app = await createApplication({ providers: [provideAttrs()] })

/** Место корня: компонент — его представлением в месте, с инжектором места. */
function outletPlace(outlet: ViewContainerRef, element?: Element): TPlace {
	return { injector: outlet.injector, element, attach: (view) => outlet.insert(view) }
}

/**
 * Место в проекции владельца: элемент уже стоит в его разметке, и
 * представление компонента проверяет приложение, а не место корня — вставка в
 * место перенесла бы элемент из проекции. Инжектор — владельца: DI шаблона
 * идёт по дереву объявлений, и часть, написанная внутри владельца, видит его
 * провайдеры — слой лифта коллекции (`provideElevator()`).
 */
function projectionPlace(owner: ComponentRef<unknown>, element: Element): TPlace {
	return { injector: owner.injector, element, attach: (view) => app.attachView(view) }
}

/**
 * Компонент — в место, со связками входов, как его ставит шаблон.
 *
 * Связка (`inputBinding`) стоит на каждом входе компонента и читает пропсы из
 * сигнала: смена пропсов — новое значение сигнала, а снятый проп связка отдаёт
 * входу как `undefined`, и сборка ядра возвращает свойство к умолчанию
 * декларации. Не `setInput` по пришедшим именам: в компонент с директивой со
 * связками — иконку по роли — Angular его не пускает. Проп без входа —
 * расхождение адаптера с дескриптором, и хост его не глушит.
 */
function insert<T extends object>(
	place: TPlace,
	component: Type<T>,
	props: TProps,
	options: TInsertOptions = {},
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
		elementInjector: place.injector,
		hostElement: place.element,
		directives: [...(options.directives ?? [])],
		projectableNodes: options.projected,
		bindings: [...inputs].map((name) => inputBinding(name, () => current()[name])),
	})

	place.attach(ref.hostView)

	return { ref, write: (next) => current.set(checked(next)) }
}

/**
 * Узлы содержимого — до сборки компонента: компонент получает их проекцией при
 * создании, а части соберутся на своих элементах позже (`assembleParts`).
 */
function nodesOf(content: readonly TContent[] = []): TContentNode[] {
	return content.map((entry) =>
		typeof entry === 'function' ? { node: entry() } : { node: entry.element(), part: entry },
	)
}

/**
 * Узлы содержимого — по проекциям компонента, как их раздал бы шаблон: часть
 * со слотом — в `<ng-content select="[slot=…]">`, остальное — в основную.
 * Проекции у компонента нет — ошибка описания, а не пропавшее содержимое.
 */
function project(component: Type<object>, nodes: readonly TContentNode[]): Node[][] {
	const selectors = reflectComponentType(component)?.ngContentSelectors ?? []
	const projected: Node[][] = selectors.map(() => [])

	for (const { node, part } of nodes) {
		const selector = part?.slot === undefined ? '*' : `[slot=${part.slot}]`
		const index = selectors.indexOf(selector)

		if (index < 0) throw new Error(`[playground] у ${component.name} нет проекции ${selector}`)

		projected[index].push(node)
	}

	return projected
}

/**
 * Собрать компонент сразу — проверкой его представления: хуки идут по порядку
 * разметки, как в шаблоне. Элемент коллекции читает лифт владельца при своей
 * сборке (`ngOnInit`), а владелец кладёт туда свой движок в своей, — поэтому
 * владелец собирается раньше своих частей, а части — по порядку и входят в
 * коллекцию в порядке разметки.
 */
function assemble(ref: ComponentRef<unknown>): void {
	ref.changeDetectorRef.detectChanges()
}

/**
 * Части содержимого — каждая на свой элемент в проекции владельца, с его
 * инжектором, после его сборки и по порядку; у части — свои части. Собранное
 * копится в `built`: снимается вместе с превью.
 */
function assembleParts(
	owner: ComponentRef<unknown>,
	nodes: readonly TContentNode[],
	built: ComponentRef<unknown>[],
): void {
	for (const { node, part } of nodes) {
		if (!part) continue

		const content = nodesOf(part.content)
		const { ref } = insert(projectionPlace(owner, node), part.component, part.props ?? {}, {
			projected: project(part.component, content),
		})

		built.push(ref)
		assemble(ref)
		assembleParts(ref, content, built)
	}
}

/**
 * Пропсы компонента превью: данные превью (`props` описания), а поверх —
 * пропсы оболочки, как `{ items, columns, ...bind }` у Vue и React.
 */
function propsOf(preview: TComponentPreview, props: TProps): TProps {
	return preview.props ? { ...preview.props(props), ...props } : props
}

/**
 * Превью: компонент адаптера по описанию карты — в обёртке или рамке и с
 * содержимым; пропсы оболочки — пропсы превью и строки — уходят его входам,
 * его выходы и слушают.
 *
 * Обёртка или рамка — в месте корня, компонент — на своём элементе в её
 * проекции, части — на своих в проекциях компонента. Собирается всё снаружи
 * внутрь (`assemble`): обёртка раньше компонента, компонент раньше частей.
 * Новые пропсы оболочки рамка получает вместе с компонентом: её стиль — от
 * них.
 *
 * Превью своим шаблоном ставится путём фикстуры (`drawTemplate`): компонент
 * хоста со своей разметкой, пропсы — его входам, выходы — у компонента в ней.
 */
function drawPreview(
	outlet: ViewContainerRef,
	component: string,
	props: TProps,
	listeners: readonly TOutputListener[],
): TDrawn {
	const preview = PREVIEWS[component]

	if (!preview) throw new Error(`[playground] хост Angular не умеет рисовать «${component}»`)

	if ('template' in preview) return drawTemplate(outlet, preview.template, props, listeners)

	// Разметка превью — от пропсов постановки, как содержимое превью описанием
	if ('templateFor' in preview) {
		return drawTemplate(outlet, preview.templateFor(props), props, listeners)
	}

	const built: ComponentRef<unknown>[] = []
	let unlisten = (): void => {}
	let reframe: (next: TProps) => void = () => {}

	// Снимается в порядке сборки, как представление шаблона: владелец раньше
	// частей
	const destroy = (): void => {
		unlisten()

		for (const ref of built) ref.destroy()
	}

	try {
		let place: TPlace

		if (preview.wrapper) {
			const element = preview.element()
			const { ref: wrapper } = insert(
				outletPlace(outlet),
				preview.wrapper.component,
				preview.wrapper.props ?? {},
				{ projected: project(preview.wrapper.component, [{ node: element }]) },
			)

			built.push(wrapper)
			assemble(wrapper)
			place = projectionPlace(wrapper, element)
		} else if (preview.frame) {
			const { frame } = preview
			const element = preview.element()
			const { ref, write } = insert(
				outletPlace(outlet),
				PreviewFrameComponent,
				{ frame: frame(props) },
				{ projected: project(PreviewFrameComponent, [{ node: element }]) },
			)

			built.push(ref)
			assemble(ref)
			place = projectionPlace(ref, element)
			reframe = (next) => write({ frame: frame(next) })
		} else {
			place = outletPlace(outlet, preview.element?.())
		}

		// Содержимое, которое зависит от пропсов оболочки, — по пропсам постановки
		const content = nodesOf(
			typeof preview.content === 'function' ? preview.content(props) : preview.content,
		)
		const { ref, write } = insert(place, preview.component, propsOf(preview, props), {
			directives: preview.directives,
			projected: project(preview.component, content),
		})

		built.push(ref)
		// Слушатели — раньше сборки, как подписки на выходы в шаблоне: события
		// частей, которые входят в коллекцию, уже есть кому принять
		unlisten = listen(ref.instance, listeners)
		assemble(ref)
		assembleParts(ref, content, built)

		return {
			write(next) {
				reframe(next)
				write(propsOf(preview, next))
			},
			destroy,
		}
	} catch (error) {
		destroy()
		throw error
	}
}

/** Фикстура: свой компонент с разметкой слотов — путём своей разметки (`drawTemplate`). */
function drawFixture(
	outlet: ViewContainerRef,
	fixture: string,
	props: TProps,
	listeners: readonly TOutputListener[],
): TDrawn {
	const type = FIXTURES[fixture]

	if (!type) throw new Error(`[playground] хост Angular не умеет рисовать «${fixture}»`)

	return drawTemplate(outlet, type, props, listeners)
}

/**
 * Компонент хоста со своей разметкой — фикстура сценария или превью своим
 * шаблоном: пропсы оболочки — его входам, а слушают выходы компонента в его
 * разметке (`subject`), как у превью — выходы самого компонента.
 */
function drawTemplate(
	outlet: ViewContainerRef,
	type: Type<TFixture>,
	props: TProps,
	listeners: readonly TOutputListener[],
): TDrawn {
	const { ref, write } = insert(outletPlace(outlet), type, props)
	const unlisten = listen(ref.instance.subject(), listeners)

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
 * Корень проверяется раньше, чем в нём соберётся компонент: провайдер уже
 * держит язык шапки, и сборка видит его, а не английский, с которым создан
 * источник локали, — как в шаблоне, где Angular пишет вход провайдера раньше
 * хуков его детей. Проверяется его представление (`detectChanges`), а не
 * приложение: такт приложения у `mount` один, в конце. Ручной такт Angular
 * переводит планировщик на микрозадачи до конца задачи браузера, и в режиме
 * разработки первое уведомление после каждого такта идёт в счёт бесконечного
 * цикла (NG0103 после сотни подряд). Страница оболочки монтирует все превью в
 * одну задачу — у Select их под семьдесят, — и два такта на превью роняли её.
 *
 * Смена `ctrl` ставит превью заново, с обёрткой и частями: экземпляр ядра
 * адаптер берёт при сборке, а не на лету.
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

		// Корень проверен раньше сборки компонента: провайдер уже держит язык шапки.
		// Представлением, а не тактом приложения — такт у `mount` один (см. шапку)
		app.attachView(root.hostView)
		root.changeDetectorRef.detectChanges()

		// Корень — в документ, когда в нём есть что рисовать: превью нет или
		// проп без входа — узел оболочки остаётся пустым
		try {
			drawn = draw(bind)
		} catch (error) {
			root.destroy()
			throw error
		}

		node.appendChild(element)
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
