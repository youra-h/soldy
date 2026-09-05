import { ChangeDetectionStrategy, Component, Input } from '@angular/core'

@Component({
	selector: 'demo-panel',
	standalone: true,
	changeDetection: ChangeDetectionStrategy.OnPush,
	template: `
		<div class="panel-demo">
			@if (title) {
				<h3 class="panel-demo__title">{{ title }}</h3>
			}
			<div class="panel-demo__content"><ng-content></ng-content></div>
			@if (info) {
				<div class="panel-demo__info">{{ info }}</div>
			}
		</div>
	`,
})
export class PanelDemoComponent {
	@Input() title?: string
	@Input() info?: string
}
