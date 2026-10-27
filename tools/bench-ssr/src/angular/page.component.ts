import {
	ChangeDetectionStrategy,
	Component,
	InjectionToken,
	ViewChild,
	ViewContainerRef,
	inject,
	reflectComponentType,
	type OnInit,
	type Type,
} from '@angular/core'
import type { TLocale } from '@soldy-ui/plugins'
import { LocaleProviderDirective } from '@soldy-ui/angular'
import {
	PREVIEWS,
	type TProps,
} from '../../../../packages/playground/vue/src/hosts/angular/previews'
import type { TFixture } from '../../../../packages/playground/vue/src/hosts/angular/fixtures'
import type { TPageComponent } from '../page'

/** The request's page: its language and components — a provider per request. */
export const PAGE = new InjectionToken<{
	readonly locale: TLocale
	readonly components: readonly TPageComponent[]
}>('bench-ssr page')

/**
 * Props without an input: the root's tag is the element's own, as the stand's
 * Angular host skips it (`ELEMENT_PROPS` in `hosts/angular/index.ts`).
 */
const ELEMENT_PROPS: ReadonlySet<string> = new Set(['tag'])

/** A preview: its component by the props it is placed with (`templateFor`). */
function previewOf(id: string, props: TProps): Type<TFixture> {
	const preview = PREVIEWS[id]

	return 'template' in preview ? preview.template : preview.templateFor(props)
}

/**
 * The Angular page: the previews of the stand's Angular host in the
 * provider's place, one copy each.
 *
 * The previews are placed as the host places them: a preview gets its props
 * through its inputs, is checked, and stamps its copy (`CopyDirective`), which
 * assembles in the next check. They are placed on the root's init — before the
 * check of its template, so the provider holds the request's language by the
 * time the copies assemble, as in an application template.
 */
@Component({
	selector: 'bench-page',
	imports: [LocaleProviderDirective],
	changeDetection: ChangeDetectionStrategy.OnPush,
	template: `
		<ng-container so-locale-provider [locale]="page.locale">
			<ng-container #outlet />
		</ng-container>
	`,
})
export class PageComponent implements OnInit {
	protected readonly page = inject(PAGE)

	@ViewChild('outlet', { read: ViewContainerRef, static: true })
	private readonly _outlet?: ViewContainerRef

	ngOnInit(): void {
		const outlet = this._outlet

		if (!outlet) throw new Error('[bench-ssr] no outlet')

		for (const { id, props } of this.page.components) {
			const type = previewOf(id, props)
			const ref = outlet.createComponent(type)
			const inputs = new Set(
				(reflectComponentType(type)?.inputs ?? []).map(({ templateName }) => templateName),
			)

			for (const [name, value] of Object.entries(props)) {
				if (ELEMENT_PROPS.has(name)) continue
				if (!inputs.has(name))
					throw new Error(`[bench-ssr] ${type.name} has no input ${name}`)

				ref.setInput(name, value)
			}

			ref.changeDetectorRef.detectChanges()
			ref.instance.copy().stamp(1)
		}
	}
}
