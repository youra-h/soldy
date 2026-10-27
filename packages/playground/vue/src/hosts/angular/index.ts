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
 * Props that a component of Angular has no input for: the root's tag is the
 * element's own (`<a so-button>`), and the adapter declares no `tag` input.
 * The host does not write it, as the Web Components host does not.
 */
const ELEMENT_PROPS: ReadonlySet<string> = new Set(['tag'])

/**
 * The host's application — one for all roots, without Zone.js: the adapter is
 * built for zoneless, the components' state is signals. One rather than one
 * per root: a mount id is the number of an assembly in the application
 * (`ng-1`, `ng-2`), and two applications on one page would give parts equal
 * ids. The adapter's renderer (`provideAttrs()`) is provided, as in an
 * application's `appConfig`: without it fields and collections do not
 * assemble.
 */
const app = await createApplication({ providers: [provideAttrs()] })

/**
 * A component of the host — a preview or a fixture — into the root's place,
 * with input bindings, as a template places it.
 *
 * A binding (`inputBinding`) stands on every input of the component and reads
 * the props from a signal: a change of the props is a new value of the signal,
 * and a removed prop comes to the input as `undefined`, so the core assembly
 * returns the property to the declaration's default. The DI of the place goes
 * through the root's locale provider, and the assembly sees its locale. A prop
 * without an input is a mismatch of the adapter with the descriptor, and the
 * host does not mute it. The listeners of the preview's parts go to the
 * component's injector (`PART_LISTENERS`): the parts its markup marks
 * `pg-part` take them there.
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
 * A component of the host with `count` copies of its markup: the shell's props
 * go to its inputs, and the host listens to the outputs of the component in
 * every copy (`subjects`).
 *
 * The component is checked before the copies are stamped: its inputs reach
 * its markup, the state of a copy among them (`pg-copy-state`). The copies are
 * created right away (`CopyDirective.stamp`), and the listeners stand before
 * their assembly, which comes with the next check, as the output bindings of a
 * template: the events of the parts entering a collection already have
 * someone to receive them. They go after the destruction, as the output
 * bindings of a template, which Angular removes after the hooks of its view:
 * what a teardown sends reaches them, and the parity run hears it.
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
 * with `so-locale-provider` in it: the shell's context does not pass into
 * another root, and the host gives the root the header's language. The host
 * puts the preview into the root too (`insert`): the props come by their
 * markup names, and Angular lists the bindings of a template by name.
 *
 * The application checks the components' state itself, on its own tick. But
 * `mount`, `update` and `setLocale` end with a check in the same call
 * (`app.tick()`), as `flushSync` in React: the contract promises the component
 * in the DOM on return, and the shell changes props and language from its own
 * watchers, outside Angular's tick.
 *
 * The root is checked before the component assembles in it: the provider
 * already holds the header's language, and the assembly sees it rather than
 * the English the locale source was created with — as in a template, where
 * Angular writes the provider's input before the hooks of its children. Its
 * view is checked (`detectChanges`), not the application: the application
 * ticks once per `mount`. A manual tick of Angular switches the scheduler to
 * microtasks until the end of the browser task, and in development mode the
 * first notification after each tick counts towards an infinite loop (NG0103
 * after a hundred in a row). The shell's page mounts all previews in one task —
 * Select has about seventy of them, — and two ticks per preview brought it
 * down.
 *
 * A change of `ctrl` places the preview anew, with its parts: the adapter takes
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

		// The root is checked before the component assembles: the provider already
		// holds the header's language. By its view, not by a tick of the
		// application — `mount` ticks once (see the header)
		app.attachView(root.hostView)
		root.changeDetectorRef.detectChanges()

		// The root goes into the document when it has something to draw: no
		// preview or a prop without an input — the shell's node stays empty
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
