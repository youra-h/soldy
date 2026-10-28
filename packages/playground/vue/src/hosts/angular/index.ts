import {
	Injector,
	createComponent,
	inputBinding,
	reflectComponentType,
	signal,
	type ComponentRef,
	type Type,
	type ViewContainerRef,
} from '@angular/core'
import { createApplication } from '@angular/platform-browser'
import { provideAttrs } from '@soldy-ui/angular'
import {
	componentDescriptors,
	findComponent,
	partsOf,
	type IPreviewHost,
} from '@soldy-ui/playground-shared'
import { PREVIEWS, type TProps } from './previews'
import { FIXTURES, type TFixture } from './fixtures'
import { PART_LISTENERS, listen, listenersOf, type TOutputListener } from './events'
import { PreviewRootComponent, language } from './root.component'

/** Listeners of the preview's parts, by part name (`partsOf`). */
type TParts = Readonly<Record<string, readonly TOutputListener[]>>

/** A preview in the root: new props and removal. */
type TDrawn = {
	write(props: TProps): void
	destroy(): void
}

/**
 * Props an Angular component has no input for: the root's tag is the
 * element's own (`<a so-button>`), and the adapter declares no `tag` input.
 * The host does not write it, like the Web Components host.
 */
const ELEMENT_PROPS: ReadonlySet<string> = new Set(['tag'])

/**
 * The host's application, one for all roots, without Zone.js: the adapter is
 * built for zoneless, and the components' state is signals. One rather than
 * one per root: a mount id is the number of an assembly in the application
 * (`ng-1`, `ng-2`), and two applications on one page would give parts equal
 * ids. The adapter's renderer (`provideAttrs()`) is provided as in an app's
 * `appConfig`: without it fields and collections do not assemble.
 */
const app = await createApplication({ providers: [provideAttrs()] })

/**
 * Places a host component (a preview or a fixture) into the root's outlet,
 * with input bindings, as a template places it.
 *
 * Every input of the component gets a binding (`inputBinding`) that reads the
 * props from a signal: new props are a new signal value, and a removed prop
 * reaches the input as `undefined`, so the core assembly returns the property
 * to the declared default. The place's DI goes through the root's locale
 * provider, so the assembly sees its locale. A prop without an input is a
 * mismatch between the adapter and the descriptor, and the host throws rather
 * than hiding it. The listeners of the preview's parts go to the component's
 * injector (`PART_LISTENERS`), where the parts its markup marks `pg-part`
 * take them.
 */
function insert<T extends object>(
	outlet: ViewContainerRef,
	component: Type<T>,
	props: TProps,
	parts: TParts,
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
		elementInjector: Injector.create({
			providers: [{ provide: PART_LISTENERS, useValue: parts }],
			parent: outlet.injector,
		}),
		bindings: [...inputs].map((name) => inputBinding(name, () => current()[name])),
	})

	outlet.insert(ref.hostView)

	return { ref, write: (next) => current.set(checked(next)) }
}

/**
 * A host component with `count` copies of its markup: the shell's props go to
 * its inputs, and the host listens to the outputs of the component in every
 * copy (`subjects`).
 *
 * The component is checked before the copies are stamped, so its inputs,
 * including a copy's state (`pg-copy-state`), reach its markup. The copies are
 * created at once (`CopyDirective.stamp`), and the listeners are attached
 * before the copies assemble on the next check, like a template's output
 * bindings: the events of parts entering a collection already have a
 * receiver. They are removed after the destruction, again like a template's
 * output bindings, which Angular removes after its view's hooks: what a
 * teardown sends still reaches them, and the parity run hears it.
 */
function drawTemplate(
	outlet: ViewContainerRef,
	type: Type<TFixture>,
	props: TProps,
	listeners: readonly TOutputListener[],
	parts: TParts,
	count: number,
): TDrawn {
	const { ref, write } = insert(outlet, type, props, parts)

	try {
		ref.changeDetectorRef.detectChanges()
		ref.instance.copy().stamp(count)
	} catch (error) {
		ref.destroy()
		throw error
	}

	const unlisten = ref.instance.subjects().map((subject) => listen(subject, listeners))

	return {
		write,
		destroy() {
			ref.destroy()

			for (const stop of unlisten) stop()
		},
	}
}

/** A preview: its component by the props it is placed with (`templateFor`). */
function previewOf(component: string, props: TProps): Type<TFixture> {
	const preview = PREVIEWS[component]

	if (!preview) throw new Error(`[playground] хост Angular не умеет рисовать «${component}»`)

	return 'template' in preview ? preview.template : preview.templateFor(props)
}

/** A fixture: a component of the host with slot markup. */
function fixtureOf(fixture: string): Type<TFixture> {
	const type = FIXTURES[fixture]

	if (!type) throw new Error(`[playground] хост Angular не умеет рисовать «${fixture}»`)

	return type
}

/**
 * The Angular host.
 *
 * A preview is a root of its own (`PreviewRootComponent`) on the shell's node,
 * with `so-locale-provider` in it: the shell's context does not cross into
 * another root, so the host gives the root the header's language. The host
 * also puts the preview into the root (`insert`): the props come by their
 * markup names, and Angular binds a template's inputs by name.
 *
 * The application checks the components' state itself, on its own tick. But
 * `mount`, `update` and `setLocale` end with a check in the same call
 * (`app.tick()`), like `flushSync` in React: the contract promises the
 * component in the DOM on return, and the shell changes props and language
 * from its own watchers, outside Angular's tick.
 *
 * The root is checked before the component assembles in it, so the provider
 * already holds the header's language and the assembly sees it rather than
 * the English the locale source was created with, as in a template, where
 * Angular writes the provider's input before its children's hooks. The root's
 * view is checked (`detectChanges`), not the application, which ticks once
 * per `mount`. A manual Angular tick switches the scheduler to microtasks
 * until the end of the browser task, and in development mode the first
 * notification after each tick counts towards an infinite loop (NG0103 after
 * a hundred in a row). The shell's page mounts all previews in one task
 * (Select has about seventy), and two ticks per preview brought it down.
 *
 * A `ctrl` change places the preview anew, with its parts: the adapter takes
 * the core instance at assembly, not on the fly.
 */
const host: IPreviewHost = {
	previews: Object.keys(PREVIEWS),
	fixtures: Object.keys(FIXTURES),

	mount(node, { component, fixture, props, onEvent, count = 1 }) {
		const entry = findComponent(component)
		const listeners = entry && onEvent ? listenersOf(componentDescriptors(entry), onEvent) : []
		// A fixture's markup is its own: its parts are not listened to
		const parts =
			entry && onEvent && fixture === undefined ? partsOf(entry, onEvent, listenersOf) : {}
		const root = createComponent(PreviewRootComponent, { environmentInjector: app.injector })
		const element: Element = root.location.nativeElement
		const outlet = root.instance.outlet()
		// The copies are in the same place one after another (`TPreviewMount.count`)
		const draw = (next: TProps): TDrawn =>
			drawTemplate(
				outlet,
				fixture === undefined ? previewOf(component, next) : fixtureOf(fixture),
				next,
				listeners,
				parts,
				count,
			)

		let bind = props
		let drawn: TDrawn

		// The root is checked before the component assembles, so the provider
		// already holds the header's language. Its view is checked, not the
		// application: `mount` ticks once (see the host's comment)
		app.attachView(root.hostView)
		root.changeDetectorRef.detectChanges()

		// The root goes into the document only once it has something to draw: with
		// no preview, or a prop without an input, the shell's node stays empty
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
