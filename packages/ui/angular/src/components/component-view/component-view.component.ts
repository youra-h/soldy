import { Component, ChangeDetectionStrategy, HostBinding } from '@angular/core'
import type { IComponentView } from '@soldy-ui/core'
import type { TBinding } from '../../adapter'
import {
	ComponentViewInputNames,
	ComponentViewOutputNames,
	TComponentViewOutputs,
} from './base.component'
import { setupComponentView } from './setup.component'

/**
 * TComponentViewComponent — слой TComponentView с DOM-биндингом.
 *
 * inputs/outputs — статические константы из generated/component-view.metadata.ts,
 * оттуда же база `TComponentViewOutputs` — типы выходов для строгого шаблона.
 * Классы и видимость применяются к хост-элементу через @HostBinding.
 *
 * Хост существует всё время жизни компонента, поэтому привязку к
 * TElementPlugin берёт на себя TComponentBase со стратегией `'host'` —
 * в отличие от Button, где корень живёт внутри @if и пересоздаётся.
 *
 * `dir`/`aria`/`dataset`/`attrs` на хост-элемент раскладывает та же
 * стратегия `'host'` в `TComponentBase` (переиспользует `applyAttributes` из
 * `AriaDirective`) — здесь для них нет ни `@HostBinding`, ни директивы,
 * потому что шаблона с элементом-целью у хост-компонента нет.
 *
 * Selector: <soldy-component-view>
 */
@Component({
	selector: 'soldy-component-view',
	standalone: true,
	inputs: [...ComponentViewInputNames],
	outputs: [...ComponentViewOutputNames],
	changeDetection: ChangeDetectionStrategy.OnPush,
	template: `<ng-content></ng-content>`,
})
export class TComponentViewComponent extends TComponentViewOutputs<IComponentView> {
	@HostBinding('class') get hostClass(): string {
		return this.state().classes?.join(' ') ?? ''
	}

	@HostBinding('style.display') get hostDisplay(): string | null {
		const state = this.state()

		return state['rendered'] === false || state['visible'] === false ? 'none' : null
	}

	constructor() {
		super(ComponentViewInputNames, ComponentViewOutputNames, 'host')
	}

	protected createBinding(
		ctrl: IComponentView | undefined,
		inputs: object,
	): TBinding<IComponentView> {
		return setupComponentView(ctrl, inputs)
	}
}
