import {
	ChangeDetectionStrategy,
	Component,
	input,
	viewChild,
	viewChildren,
	type Signal,
	type Type,
} from '@angular/core'
import type { IButton, ILabel } from '@soldy-ui/core'
import {
	RoleIconDirective,
	SlotDirective,
	TButtonComponent,
	TCheckBoxComponent,
	TIconComponent,
	TLabelComponent,
	TRadioGroupComponent,
	TRadioGroupItemComponent,
	TSwitchComponent,
} from '@soldy-ui/angular'
import { CopyDirective } from './copy.directive'

/**
 * Scenario markup that the previews do not have — slot content to check — in
 * Angular.
 *
 * The keys and the markup are those of the Vue and React hosts: the scenarios
 * of the shared package look for the same things in the scene, whatever
 * framework drew it. Button slots in Angular are elements with a `slot`
 * attribute, and a slot with a scope is `<ng-template slot="default" let-text>`.
 *
 * A fixture is a component with its own template: slot content cannot be laid
 * out by name in markup, and only a template gives a slot its scope. So the
 * fixture takes the scenario's props as its inputs — those its scenarios write
 * (`text` and `ctrl`) — and passes them to the scenario's component with
 * bindings. A prop the fixture has no input for the host calls an error, as for
 * a preview. The field names are not prop names: the inputs of fixtures and
 * previews are named after the page's props, and `target` is a prop of the
 * layers (dialog, drawer).
 *
 * The same shape serves the previews (`TPreview`): a component of the host
 * whose markup is one copy.
 */
export type TFixture = {
	/** The markup of one copy: the host stamps the copies from it. */
	readonly copy: Signal<CopyDirective>
	/** The scenario's component in each copy: the host listens to its outputs. */
	readonly subjects: Signal<readonly object[]>
}

@Component({
	selector: 'pg-button-slot-labels',
	imports: [TButtonComponent, SlotDirective, CopyDirective],
	changeDetection: ChangeDetectionStrategy.OnPush,
	host: { style: 'display: contents' },
	// Метки во всех трёх слотах: сценарий ищет их по `data-probe` и сверяет
	// порядок, а в `default` печатает то, что пришло в scope
	template: `
		<ng-template pg-copy>
			<button so-button [ctrl]="ctrl()" [text]="text()">
				<span slot="leading" data-probe="leading">L</span>
				<ng-template slot="default" let-text>
					<span data-probe="default">{{ text }}</span>
				</ng-template>
				<span slot="trailing" data-probe="trailing">T</span>
			</button>
		</ng-template>
	`,
})
class ButtonSlotLabels implements TFixture {
	readonly ctrl = input<IButton>()
	readonly text = input<string>()
	readonly copy = viewChild.required(CopyDirective)
	readonly subjects = viewChildren(TButtonComponent)
}

@Component({
	selector: 'pg-button-slot-icons',
	imports: [TButtonComponent, TIconComponent, RoleIconDirective, CopyDirective],
	changeDetection: ChangeDetectionStrategy.OnPush,
	host: { style: 'display: contents' },
	// Иконки по краям — подпись длинная, из пропа `text` сценария
	template: `
		<ng-template pg-copy>
			<button so-button [ctrl]="ctrl()" [text]="text()">
				<svg slot="leading" so-icon so-role-icon="check"></svg>
				<svg slot="trailing" so-icon so-role-icon="arrowRight"></svg>
			</button>
		</ng-template>
	`,
})
class ButtonSlotIcons implements TFixture {
	readonly ctrl = input<IButton>()
	readonly text = input<string>()
	readonly copy = viewChild.required(CopyDirective)
	readonly subjects = viewChildren(TButtonComponent)
}

@Component({
	selector: 'pg-label-check-box',
	imports: [TLabelComponent, TCheckBoxComponent, CopyDirective],
	changeDetection: ChangeDetectionStrategy.OnPush,
	host: { style: 'display: contents' },
	// Подпись вокруг контрола: текст — из пропа `text` сценария, контрол — в
	// основной проекции
	template: `
		<ng-template pg-copy>
			<label so-label [ctrl]="ctrl()" [text]="text()">
				<span so-check-box></span>
			</label>
		</ng-template>
	`,
})
class LabelCheckBox implements TFixture {
	readonly ctrl = input<ILabel>()
	readonly text = input<string>()
	readonly copy = viewChild.required(CopyDirective)
	readonly subjects = viewChildren(TLabelComponent)
}

@Component({
	selector: 'pg-label-switch',
	imports: [TLabelComponent, TSwitchComponent, CopyDirective],
	changeDetection: ChangeDetectionStrategy.OnPush,
	host: { style: 'display: contents' },
	template: `
		<ng-template pg-copy>
			<label so-label [ctrl]="ctrl()" [text]="text()">
				<span so-switch></span>
			</label>
		</ng-template>
	`,
})
class LabelSwitch implements TFixture {
	readonly ctrl = input<ILabel>()
	readonly text = input<string>()
	readonly copy = viewChild.required(CopyDirective)
	readonly subjects = viewChildren(TLabelComponent)
}

@Component({
	selector: 'pg-label-radio',
	imports: [TLabelComponent, TRadioGroupComponent, TRadioGroupItemComponent, CopyDirective],
	changeDetection: ChangeDetectionStrategy.OnPush,
	host: { style: 'display: contents' },
	// Корень радио — `label`, а `label` в `label` HTML запрещает: внутри
	// подписи радио пишут на строчном теге. Группа вокруг — ради общего `name`
	template: `
		<ng-template pg-copy>
			<div so-radio-group>
				<label so-label [ctrl]="ctrl()" [text]="text()">
					<span so-radio-group-item value="a"></span>
				</label>
			</div>
		</ng-template>
	`,
})
class LabelRadio implements TFixture {
	readonly ctrl = input<ILabel>()
	readonly text = input<string>()
	readonly copy = viewChild.required(CopyDirective)
	readonly subjects = viewChildren(TLabelComponent)
}

export const FIXTURES: Record<string, Type<TFixture>> = {
	'button-slot-labels': ButtonSlotLabels,
	'button-slot-icons': ButtonSlotIcons,
	'label-check-box': LabelCheckBox,
	'label-switch': LabelSwitch,
	'label-radio': LabelRadio,
}
