import { ChangeDetectionStrategy, Component, Input } from '@angular/core'
import { TComponentViewComponent } from '@soldy/ui-angular'
import { PanelDemoComponent } from '../../common/panel-demo.component'

@Component({
	selector: 'demo-component-view-slots',
	standalone: true,
	imports: [TComponentViewComponent, PanelDemoComponent],
	changeDetection: ChangeDetectionStrategy.OnPush,
	template: `
		<div class="demo-slots-column">
			<demo-panel title="Default Slot">
				<soldy-component-view
					[tag]="tag"
					[visible]="visible"
					[rendered]="rendered"
					class="cv-demo-box cv-demo-box--violet"
				>
					<div class="cv-demo-content">
						<div class="cv-demo-title cv-demo-title--violet">Default Slot</div>
						<div class="cv-demo-subtitle">Simple text content</div>
					</div>
				</soldy-component-view>
			</demo-panel>

			<demo-panel title="Multiple Children">
				<soldy-component-view
					[tag]="tag"
					[visible]="visible"
					[rendered]="rendered"
					class="cv-demo-box cv-demo-box--orange"
				>
					<div class="cv-demo-content">
						<div class="cv-demo-title cv-demo-title--orange">Multiple Children</div>
						<button class="cv-demo-btn">Button</button>
						<p class="cv-demo-subtitle">Some paragraph text</p>
					</div>
				</soldy-component-view>
			</demo-panel>
		</div>
	`,
})
export class ComponentViewSlotsDemoComponent {
	@Input() visible = true
	@Input() rendered = true
	@Input() tag = 'div'
}
