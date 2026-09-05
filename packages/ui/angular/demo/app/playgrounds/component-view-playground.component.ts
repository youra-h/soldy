import { ChangeDetectionStrategy, Component, ViewChild } from '@angular/core'
import { PlaygroundLayoutComponent } from '../layouts/playground-layout.component'
import { PropertiesComponent, type TPropertiesSchema } from '../common/properties.component'
import { ComponentViewPropsDemoComponent } from '../components/component-view/component-view-props-demo.component'
import { ComponentViewInstanceDemoComponent } from '../components/component-view/component-view-instance-demo.component'
import { ComponentViewSlotsDemoComponent } from '../components/component-view/component-view-slots-demo.component'
import { HTML_TAGS } from '../common/items'

const schema: TPropertiesSchema = {
	visible: { type: 'boolean', default: true },
	rendered: { type: 'boolean', default: true },
	tag: { type: 'select', default: 'div', options: HTML_TAGS },
}

@Component({
	selector: 'demo-component-view-playground',
	standalone: true,
	imports: [
		PlaygroundLayoutComponent,
		PropertiesComponent,
		ComponentViewPropsDemoComponent,
		ComponentViewInstanceDemoComponent,
		ComponentViewSlotsDemoComponent,
	],
	changeDetection: ChangeDetectionStrategy.OnPush,
	template: `
		<demo-playground-layout [title]="'ComponentView Playground'">
			<demo-properties
				properties
				[schema]="schema"
				[value]="props"
				(changed)="onChange($event)"
				(showRequested)="onShow()"
				(hideRequested)="onHide()"
			/>

			<demo-component-view-props
				propsDemo
				[visible]="props.visible"
				[rendered]="props.rendered"
				[tag]="props.tag"
			/>

			<demo-component-view-instance
				instanceDemo
				[visible]="props.visible"
				[rendered]="props.rendered"
				[tag]="props.tag"
			/>

			<demo-component-view-slots
				slotsDemo
				[visible]="props.visible"
				[rendered]="props.rendered"
				[tag]="props.tag"
			/>
		</demo-playground-layout>
	`,
})
export class ComponentViewPlaygroundComponent {
	protected readonly schema = schema

	props = {
		visible: true,
		rendered: true,
		tag: 'div',
	}

	@ViewChild(ComponentViewInstanceDemoComponent) private instanceDemo?: ComponentViewInstanceDemoComponent

	protected onChange(next: Record<string, any>): void {
		this.props = { ...this.props, ...next }
	}

	protected onShow(): void {
		this.props = { ...this.props, visible: true }
		this.instanceDemo?.show()
	}

	protected onHide(): void {
		this.props = { ...this.props, visible: false }
		this.instanceDemo?.hide()
	}
}
