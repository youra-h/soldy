import { Directive, TemplateRef, ViewContainerRef, inject, input } from '@angular/core'

/**
 * The markup of one copy of a preview or fixture: `<ng-template pg-copy>`.
 *
 * The host stamps the copies (`TPreviewMount.count`) as views of this one
 * template, one after another in its place, as `@for` stamps them in an
 * application template. Angular keeps the description of a template's nodes —
 * with the input and output maps of every component in it — once for all its
 * views. A copy as its own root (`createComponent`) carried a description of
 * its own: about 9 KB of a Button copy's 24 (benchmarks/pages/angular.md,
 * 869fmjpha).
 *
 * The host stamps, not `@for`: it listens to the outputs of the components in
 * the copies before their assembly, as output bindings of a template do, and
 * the views of `@for` appear only in the check that assembles them.
 *
 * A copy's own state — the open state of a dialog — is the context of its view
 * (`let-…`): a new one per copy from the factory `pg-copy-state`. Without one
 * the copies share everything but their components.
 */
@Directive({ selector: 'ng-template[pg-copy]' })
export class CopyDirective<TState extends object = object> {
	/** The own state of a new copy. */
	readonly state = input<() => TState>(undefined, { alias: 'pg-copy-state' })

	private readonly _template = inject<TemplateRef<TState>>(TemplateRef)
	private readonly _place = inject(ViewContainerRef)

	/** The context of `let-…` is the copy's state. */
	static ngTemplateContextGuard<TState extends object>(
		_directive: CopyDirective<TState>,
		_context: unknown,
	): _context is TState {
		return true
	}

	/**
	 * Put `count` copies after the template. Each is created right away: its
	 * components exist, and their assembly comes with the next check.
	 */
	stamp(count: number): void {
		const state = this.state()

		for (let index = 0; index < count; index++) {
			this._place.createEmbeddedView(this._template, state?.())
		}
	}
}
