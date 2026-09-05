import { ChangeDetectionStrategy, Component, ViewChild } from '@angular/core'
import { PlaygroundLayoutComponent } from '../layouts/playground-layout.component'
import { PropertiesComponent, type TPropertiesSchema } from '../common/properties.component'
import { ButtonPropsDemoComponent } from '../components/button/button-props-demo.component'
import { ButtonInstanceDemoComponent } from '../components/button/button-instance-demo.component'
import { ButtonSlotsDemoComponent } from '../components/button/button-slots-demo.component'
import { SIZES, VARIANTS, BUTTON_APPEARANCES } from '../common/items'
import type { TComponentSize, TComponentVariant, TButtonView } from '@soldy/core'

const schema: TPropertiesSchema = {
	visible: { type: 'boolean', default: true },
	rendered: { type: 'boolean', default: true },
	disabled: { type: 'boolean', default: false },
	size: { type: 'select', default: 'normal', options: SIZES },
	variant: { type: 'select', default: 'normal', options: VARIANTS },
	view: { type: 'select', default: 'filled', options: BUTTON_APPEARANCES },
	text: { type: 'string', default: 'Button', placeholder: 'Button text' },
}

@Component({
	selector: 'demo-button-playground',
	standalone: true,
	imports: [
		PlaygroundLayoutComponent,
		PropertiesComponent,
		ButtonPropsDemoComponent,
		ButtonInstanceDemoComponent,
		ButtonSlotsDemoComponent,
	],
	changeDetection: ChangeDetectionStrategy.OnPush,
	template: `
		<demo-playground-layout [title]="'Button Playground'">
			<demo-properties
				properties
				[schema]="schema"
				[value]="props"
				(changed)="onChange($event)"
				(showRequested)="onShow()"
				(hideRequested)="onHide()"
			/>

			<demo-button-props
				propsDemo
				[visible]="props.visible"
				[rendered]="props.rendered"
				[disabled]="props.disabled"
				[size]="props.size"
				[variant]="props.variant"
				[view]="props.view"
				[text]="props.text"
			/>

			<demo-button-instance
				instanceDemo
				[visible]="props.visible"
				[rendered]="props.rendered"
				[disabled]="props.disabled"
				[size]="props.size"
				[variant]="props.variant"
				[view]="props.view"
				[text]="props.text"
			/>

			<demo-button-slots
				slotsDemo
				[size]="props.size"
				[variant]="props.variant"
				[disabled]="props.disabled"
			/>
		</demo-playground-layout>
	`,
})
export class ButtonPlaygroundComponent {
	protected readonly schema = schema

	props = {
		visible: true,
		rendered: true,
		disabled: false,
		size: 'normal' as TComponentSize,
		variant: 'normal' as TComponentVariant,
		view: 'filled' as TButtonView,
		text: 'Button',
	}

	@ViewChild(ButtonInstanceDemoComponent) private instanceDemo?: ButtonInstanceDemoComponent

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
