import { ChangeDetectionStrategy, Component, Input } from '@angular/core'

/**
 * PlaygroundLayout — общий каркас playground'а:
 * заголовок + панель свойств + три колонки демо (props / instance / slots).
 *
 * Секции передаются через ng-content с селекторами (аналог слотов Vue).
 */
@Component({
	selector: 'demo-playground-layout',
	standalone: true,
	changeDetection: ChangeDetectionStrategy.OnPush,
	template: `
		<div class="pg-layout">
			<div class="pg-layout__header">
				<h1 class="pg-layout__title">{{ title }}</h1>
			</div>

			<div class="pg-layout__section pg-layout__section--properties">
				<h2 class="pg-layout__section-title">Properties</h2>
				<ng-content select="[properties]"></ng-content>
			</div>

			<div class="pg-layout__demo-grid">
				<div class="pg-layout__demo-column">
					<h3 class="pg-layout__demo-title">Props Demo</h3>
					<div class="pg-layout__demo-content"><ng-content select="[propsDemo]"></ng-content></div>
				</div>

				<div class="pg-layout__demo-column">
					<h3 class="pg-layout__demo-title">Instance Demo</h3>
					<div class="pg-layout__demo-content">
						<ng-content select="[instanceDemo]"></ng-content>
					</div>
				</div>

				<div class="pg-layout__demo-column">
					<h3 class="pg-layout__demo-title">Slots Demo</h3>
					<div class="pg-layout__demo-content"><ng-content select="[slotsDemo]"></ng-content></div>
				</div>
			</div>
		</div>
	`,
})
export class PlaygroundLayoutComponent {
	@Input() title = ''
}
