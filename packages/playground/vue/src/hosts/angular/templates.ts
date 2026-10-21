import { ChangeDetectionStrategy, Component, input, viewChild } from '@angular/core'
import {
	AttributesDirective,
	SlotDirective,
	TButtonComponent,
	TPopoverComponent,
	TTooltipComponent,
} from '@soldy-ui/angular'
import type { TFixture } from './fixtures'

/**
 * Превью своим шаблоном — в Angular.
 *
 * Триггер поповера и подсказки — шаблон слота со scope (`<ng-template
 * slot="trigger">`), а шаблоны слотов видит только разметка
 * (`contentChildren`): у компонента, которого хост строит сам
 * (`createComponent`), их нет. Поэтому такое превью — компонент хоста со своей
 * разметкой, как фикстура (`TFixture`), а триггер и содержимое — те же, что у
 * превью Vue (`hosts/vue/previews.ts`). Входа «шаблон слота» ради стенда
 * библиотека не заводит.
 *
 * Пропсы оболочки компонент превью принимает своими входами и отдаёт
 * компоненту в разметке привязками — вход на каждый проп, который пишет
 * страница, и `ctrl`. Тип входа — тип поля компонента адаптера, а снятый проп
 * вход отдаёт как `undefined`, и свойство возвращается к умолчанию. Пропа без
 * входа хост не глушит: проп, который появился у дескриптора, а сюда не дошёл,
 * — ошибка на его странице. Компонент в разметке превью отдаёт хосту
 * (`target`): его выходы хост и слушает.
 */

/**
 * Popover: триггер — Button, связку с панелью и вид «нажат» он кладёт на себя
 * директивой набора. В содержимом есть кнопка: на неё при открытии уходит
 * фокус.
 */
@Component({
	selector: 'pg-popover-preview',
	imports: [TPopoverComponent, TButtonComponent, SlotDirective, AttributesDirective],
	changeDetection: ChangeDetectionStrategy.OnPush,
	host: { style: 'display: contents' },
	template: `
		<span
			so-popover
			[ctrl]="ctrl()"
			[rendered]="rendered()"
			[visible]="visible()"
			[direction]="direction()"
			[open]="open()"
			[closable]="closable()"
			[lazyMount]="lazyMount()"
			[placement]="placement()"
			[contained]="contained()"
			[edge]="edge()"
			[swipe]="swipe()"
			[aria_label]="aria_label()"
			[aria_labelledBy]="aria_labelledBy()"
			[aria_describedBy]="aria_describedBy()"
			[dismiss_enabled]="dismiss_enabled()"
		>
			<ng-template
				slot="trigger"
				let-triggerAria="triggerAria"
				let-triggerDataset="triggerDataset"
			>
				<button
					so-button
					text="Открыть"
					[so-attributes]="{ ...triggerAria, ...triggerDataset }"
				></button>
			</ng-template>
			<p style="margin: 0 0 8px">Произвольное содержимое: текст, поля, кнопки</p>
			<button so-button text="Действие"></button>
		</span>
	`,
})
export class PopoverPreview implements TFixture {
	readonly ctrl = input<TPopoverComponent['ctrl']>()
	readonly rendered = input<TPopoverComponent['rendered']>()
	readonly visible = input<TPopoverComponent['visible']>()
	readonly direction = input<TPopoverComponent['direction']>()
	readonly open = input<TPopoverComponent['open']>()
	readonly closable = input<TPopoverComponent['closable']>()
	readonly lazyMount = input<TPopoverComponent['lazyMount']>()
	readonly placement = input<TPopoverComponent['placement']>()
	readonly contained = input<TPopoverComponent['contained']>()
	readonly edge = input<TPopoverComponent['edge']>()
	readonly swipe = input<TPopoverComponent['swipe']>()
	readonly aria_label = input<TPopoverComponent['aria_label']>()
	readonly aria_labelledBy = input<TPopoverComponent['aria_labelledBy']>()
	readonly aria_describedBy = input<TPopoverComponent['aria_describedBy']>()
	readonly dismiss_enabled = input<TPopoverComponent['dismiss_enabled']>()
	readonly target = viewChild.required(TPopoverComponent)
}

/**
 * Tooltip: триггер — Button, ссылку на панель (`aria-describedby`) он кладёт
 * на себя директивой набора. Текст подсказки — содержимым: пропа текста у неё
 * нет.
 */
@Component({
	selector: 'pg-tooltip-preview',
	imports: [TTooltipComponent, TButtonComponent, SlotDirective, AttributesDirective],
	changeDetection: ChangeDetectionStrategy.OnPush,
	host: { style: 'display: contents' },
	template: `
		<span
			so-tooltip
			[ctrl]="ctrl()"
			[rendered]="rendered()"
			[visible]="visible()"
			[direction]="direction()"
			[open]="open()"
			[placement]="placement()"
			[openDelay]="openDelay()"
			[closeDelay]="closeDelay()"
			[type]="type()"
			[dismiss_enabled]="dismiss_enabled()"
		>
			<ng-template slot="trigger" let-triggerAria="triggerAria">
				<button so-button text="Наведи" [so-attributes]="triggerAria"></button>
			</ng-template>
			Короткое пояснение к кнопке
		</span>
	`,
})
export class TooltipPreview implements TFixture {
	readonly ctrl = input<TTooltipComponent['ctrl']>()
	readonly rendered = input<TTooltipComponent['rendered']>()
	readonly visible = input<TTooltipComponent['visible']>()
	readonly direction = input<TTooltipComponent['direction']>()
	readonly open = input<TTooltipComponent['open']>()
	readonly placement = input<TTooltipComponent['placement']>()
	readonly openDelay = input<TTooltipComponent['openDelay']>()
	readonly closeDelay = input<TTooltipComponent['closeDelay']>()
	readonly type = input<TTooltipComponent['type']>()
	readonly dismiss_enabled = input<TTooltipComponent['dismiss_enabled']>()
	readonly target = viewChild.required(TTooltipComponent)
}
