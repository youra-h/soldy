import {
	ChangeDetectionStrategy,
	Component,
	input,
	viewChild,
	type Signal,
	type Type,
} from '@angular/core'
import type { IButton } from '@soldy-ui/core'
import {
	RoleIconDirective,
	SlotDirective,
	TButtonComponent,
	TIconComponent,
} from '@soldy-ui/angular'

/**
 * Разметка сценариев, которой нет у превью: содержимое слотов под проверку —
 * в Angular.
 *
 * Ключи и разметка — те же, что у хостов Vue и React: сценарии в общем пакете
 * ищут в сцене одно и то же, на каком бы фреймворке её ни нарисовали. Слоты
 * Button в Angular — элементы с атрибутом `slot`, а слот со scope —
 * `<ng-template slot="default" let-text>`.
 *
 * Фикстура — компонент со своим шаблоном: содержимое слотов разметкой
 * разложить по имени нельзя, и scope слоту отдаёт только шаблон. Поэтому
 * пропсы сценария фикстура принимает своими входами — теми, что пишут её
 * сценарии (`text` и `ctrl`), — и передаёт кнопке привязками. Проп, которого
 * у фикстуры нет, хост назовёт ошибкой, как и у превью. Компонент сценария
 * фикстура отдаёт хосту (`target`): его выходы хост слушает, как у превью.
 */
export type TFixture = {
	/** Компонент сценария в разметке фикстуры. */
	readonly target: Signal<object>
}

@Component({
	selector: 'pg-button-slot-labels',
	imports: [TButtonComponent, SlotDirective],
	changeDetection: ChangeDetectionStrategy.OnPush,
	host: { style: 'display: contents' },
	// Метки во всех трёх слотах: сценарий ищет их по `data-probe` и сверяет
	// порядок, а в `default` печатает то, что пришло в scope
	template: `
		<button so-button [ctrl]="ctrl()" [text]="text()">
			<span slot="leading" data-probe="leading">L</span>
			<ng-template slot="default" let-text>
				<span data-probe="default">{{ text }}</span>
			</ng-template>
			<span slot="trailing" data-probe="trailing">T</span>
		</button>
	`,
})
class ButtonSlotLabels implements TFixture {
	readonly ctrl = input<IButton>()
	readonly text = input<string>()
	readonly target = viewChild.required(TButtonComponent)
}

@Component({
	selector: 'pg-button-slot-icons',
	imports: [TButtonComponent, TIconComponent, RoleIconDirective],
	changeDetection: ChangeDetectionStrategy.OnPush,
	host: { style: 'display: contents' },
	// Иконки по краям — подпись длинная, из пропа `text` сценария
	template: `
		<button so-button [ctrl]="ctrl()" [text]="text()">
			<svg slot="leading" so-icon so-role-icon="check"></svg>
			<svg slot="trailing" so-icon so-role-icon="arrowRight"></svg>
		</button>
	`,
})
class ButtonSlotIcons implements TFixture {
	readonly ctrl = input<IButton>()
	readonly text = input<string>()
	readonly target = viewChild.required(TButtonComponent)
}

export const FIXTURES: Record<string, Type<TFixture>> = {
	'button-slot-labels': ButtonSlotLabels,
	'button-slot-icons': ButtonSlotIcons,
}
