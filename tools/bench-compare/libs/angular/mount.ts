import {
	ChangeDetectionStrategy,
	Component,
	ViewContainerRef,
	createComponent,
	viewChild,
	type ApplicationRef,
	type EnvironmentProviders,
	type Provider,
	type Signal,
	type Type,
} from '@angular/core'
import { createApplication } from '@angular/platform-browser'

/** The root of a page: a place for the copies, inside the library's wrappers. */
export interface IPageRoot {
	readonly outlet: Signal<ViewContainerRef>
}

/**
 * The library's setup module: the application providers (renderer, theme,
 * locale of the library) and, if a library needs one in the tree, the root
 * component the copies are placed in — soldy's locale provider.
 */
export interface IAngularSetup {
	providers: (Provider | EnvironmentProviders)[]
	Root?: Type<IPageRoot>
}

/** A root without wrappers: the copies go straight into its place. */
@Component({
	selector: 'bench-root',
	changeDetection: ChangeDetectionStrategy.OnPush,
	host: { style: 'display: contents' },
	template: `<ng-container #outlet />`,
})
class PlainRoot implements IPageRoot {
	readonly outlet = viewChild.required('outlet', { read: ViewContainerRef })
}

/**
 * One application per setup, without Zone.js — as the soldy host: a mount id
 * is a build number within the application, and two applications on a page
 * would give parts equal ids.
 */
const apps = new Map<IAngularSetup['providers'], Promise<ApplicationRef>>()

function applicationOf(setup: IAngularSetup): Promise<ApplicationRef> {
	let app = apps.get(setup.providers)

	if (!app) {
		app = createApplication({ providers: setup.providers })
		apps.set(setup.providers, app)
	}

	return app
}

/**
 * `count` copies of a page under one root component of the application —
 * as the soldy host puts a preview into its root: the root on its own element
 * in the node, the copies in its place, checked synchronously. Returns the
 * unmount.
 */
export async function mountPage(
	node: HTMLElement,
	setup: IAngularSetup,
	Page: Type<unknown>,
	count: number,
): Promise<() => void> {
	const app = await applicationOf(setup)
	// Its own element: Angular does not clear a host element it was given
	const element = node.appendChild(document.createElement('div'))
	const root = createComponent(setup.Root ?? PlainRoot, {
		environmentInjector: app.injector,
		hostElement: element,
	})

	app.attachView(root.hostView)
	root.changeDetectorRef.detectChanges()

	const outlet = root.instance.outlet()

	for (let index = 0; index < count; index++) outlet.createComponent(Page)

	root.changeDetectorRef.detectChanges()

	return () => {
		root.destroy()
		element.remove()
	}
}
