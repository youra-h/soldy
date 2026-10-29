/**
 * The node plugin in the specs — only through the output `soElementCreate`.
 *
 * Every visual component has the output `soElementCreate`: the generated
 * `T<Name>Surface` the component extends gives it a type with its `declare`
 * field, and its getter, which the base defines on the prototype of the
 * generated `TViewSurface`, creates the emitter on the first read. So the
 * output is read as a field, without reflection or casts.
 *
 * The subscription is made before the first change detection: the bundle
 * announces itself on a microtask after `ngOnInit` (`TOwnBundle._announce`),
 * and `ngOnInit` is called by the first `detectChanges()`. The read here
 * creates the emitter before `ngOnInit`, and the sink of core events set there
 * finds it by name.
 */

import type { ComponentFixture } from '@angular/core/testing'
import { TElementPlugin } from '@soldy-ui/plugins'
import type { TComponentViewComponent } from '@soldy-ui/angular'

/** A component with `TElementPlugin` in its bundle: every visual one has the same `soElementCreate`. */
type TWithElementCreate = Pick<TComponentViewComponent, 'soElementCreate'>

export function elementPlugin(fixture: ComponentFixture<TWithElementCreate>): () => TElementPlugin {
	let plugin: TElementPlugin | undefined

	fixture.componentInstance.soElementCreate.subscribe((value) => {
		if (value instanceof TElementPlugin) plugin = value
	})

	return () => {
		if (!plugin) throw new Error('soElementCreate не пришёл')

		return plugin
	}
}

/** The bundle announces itself on a microtask — see `TOwnBundle._announce`. */
export const announced = (): Promise<void> => Promise.resolve()
