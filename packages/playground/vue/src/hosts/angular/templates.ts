import { ChangeDetectionStrategy, Component, input, linkedSignal, viewChild } from '@angular/core'
import type { IToastsItem, TToastsItemType } from '@soldy-ui/core'
import {
	AttributesDirective,
	SlotDirective,
	TAccordionComponent,
	TAccordionItemComponent,
	TButtonComponent,
	TDialogComponent,
	TDragAndDropComponent,
	TDrawerComponent,
	TInputComponent,
	TListBoxComponent,
	TPopoverComponent,
	TTableComponent,
	TTabsComponent,
	TTabsContentComponent,
	TTabsItemComponent,
	TToastsComponent,
	TTooltipComponent,
	TVirtualComponent,
	useToasts,
	type TToastRender,
} from '@soldy-ui/angular'
import {
	COLLECTION_ITEMS,
	COLLECTION_MANY_ITEMS,
	TABLE_COLUMNS,
	TABLE_MANY_ROWS,
	TOASTS_ITEM_TYPES,
	TOAST_SAVING,
	toastSample,
} from '@soldy-ui/playground-shared'
import type { TFixture } from './fixtures'

/**
 * Превью своим шаблоном — в Angular.
 *
 * Триггер поповера и подсказки — шаблон слота со scope (`<ng-template
 * slot="trigger">`), а шаблоны слотов видит только разметка
 * (`contentChildren`): у компонента, которого хост строит сам
 * (`createComponent`), их нет. Окну и выезжающей панели нужны кнопка, которая
 * их открывает, своё состояние открытости и части по слотам, как у превью Vue.
 * Компонент без корня — окно и перестановка — директива на `<ng-container>`, а
 * директиву хост сам не построит: `createComponent` строит только компонент.
 * Поэтому такое превью — компонент хоста со своей разметкой, как фикстура
 * (`TFixture`), а триггер и содержимое — те же, что у превью Vue
 * (`hosts/vue/previews.ts`). Входа «шаблон слота» ради стенда библиотека не
 * заводит.
 *
 * Пропсы оболочки компонент превью принимает своими входами и отдаёт
 * компоненту в разметке привязками — вход на каждый проп, который пишет
 * страница, и `ctrl`. Тип входа — тип поля компонента адаптера, а снятый проп
 * вход отдаёт как `undefined`, и свойство возвращается к умолчанию. Пропа без
 * входа хост не глушит: проп, который появился у дескриптора, а сюда не дошёл,
 * — ошибка на его странице. Компонент в разметке превью отдаёт хосту
 * (`subject`): его выходы хост и слушает.
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
	readonly subject = viewChild.required(TPopoverComponent)
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
	readonly subject = viewChild.required(TTooltipComponent)
}

/**
 * Dialog: окно на стенде открывает кнопка, как у Vue: закрытое оно спрятано, а
 * открытое накрывает страницу подложкой, и показывать его сразу было бы
 * нечестно по отношению к остальной странице.
 *
 * Открытость — своё состояние превью, сигнал, который переписывает вход
 * `visible` (`linkedSignal`), как `v-model:visible` на своём состоянии у Vue:
 * крестик, Escape и подложка закрывают окно через `(soChangeVisible)`, кнопки
 * подвала — записью сигнала, а строка `visible` задаёт его снаружи. С
 * экземпляром ядра (вторая колонка) путь тот же: запись `visible` инстанса
 * открывает окно, и выход доезжает сюда.
 */
@Component({
	selector: 'pg-dialog-preview',
	imports: [TDialogComponent, TButtonComponent, TInputComponent],
	changeDetection: ChangeDetectionStrategy.OnPush,
	host: { style: 'display: contents' },
	template: `
		<button so-button text="Открыть окно" (click)="shown.set(true)"></button>
		<div
			so-dialog
			[ctrl]="ctrl()"
			[rendered]="rendered()"
			[visible]="shown()"
			[direction]="direction()"
			[target]="target()"
			[width]="width()"
			[height]="height()"
			[closable]="closable()"
			[dismissible]="dismissible()"
			[placement]="placement()"
			[offset]="offset()"
			[maximized]="maximized()"
			[maximizable]="maximizable()"
			[alert]="alert()"
			[dismiss_enabled]="dismiss_enabled()"
			[hideOutside_enabled]="hideOutside_enabled()"
			[scrollLock_enabled]="scrollLock_enabled()"
			(soChangeVisible)="shown.set($event)"
		>
			<span slot="title">Настройки</span>
			<p style="margin: 0 0 8px">Произвольное содержимое: текст, поля, кнопки</p>
			<div so-input placeholder="Имя"></div>
			<button so-button slot="footer" text="Отмена" (click)="shown.set(false)"></button>
			<button so-button slot="footer" text="Сохранить" (click)="shown.set(false)"></button>
		</div>
	`,
})
export class DialogPreview implements TFixture {
	readonly ctrl = input<TDialogComponent['ctrl']>()
	readonly rendered = input<TDialogComponent['rendered']>()
	readonly visible = input<TDialogComponent['visible']>()
	readonly direction = input<TDialogComponent['direction']>()
	readonly target = input<TDialogComponent['target']>()
	readonly width = input<TDialogComponent['width']>()
	readonly height = input<TDialogComponent['height']>()
	readonly closable = input<TDialogComponent['closable']>()
	readonly dismissible = input<TDialogComponent['dismissible']>()
	readonly placement = input<TDialogComponent['placement']>()
	readonly offset = input<TDialogComponent['offset']>()
	readonly maximized = input<TDialogComponent['maximized']>()
	readonly maximizable = input<TDialogComponent['maximizable']>()
	readonly alert = input<TDialogComponent['alert']>()
	readonly dismiss_enabled = input<TDialogComponent['dismiss_enabled']>()
	readonly hideOutside_enabled = input<TDialogComponent['hideOutside_enabled']>()
	readonly scrollLock_enabled = input<TDialogComponent['scrollLock_enabled']>()
	/** Открытость окна — своя у превью, вход `visible` её переписывает. */
	readonly shown = linkedSignal(() => this.visible() ?? false)
	readonly subject = viewChild.required(TDialogComponent)
}

/**
 * Drawer: выезжающую панель тоже открывает кнопка — по той же причине, что
 * окно, и на том же своём состоянии (см. `DialogPreview`).
 *
 * Кнопка и панель лежат в своей коробке с `position: relative`, как у Vue: с
 * `contained` панель не уезжает, а встаёт в ближайшем позиционированном
 * предке, и строка `contained` показывает её в коробке превью, а не у края
 * всей страницы.
 */
@Component({
	selector: 'pg-drawer-preview',
	imports: [TDrawerComponent, TButtonComponent, TInputComponent],
	changeDetection: ChangeDetectionStrategy.OnPush,
	host: { style: 'display: contents' },
	template: `
		<div style="position: relative; width: 100%; min-height: 240px; overflow: hidden">
			<button so-button text="Открыть панель" (click)="shown.set(true)"></button>
			<div
				so-drawer
				[ctrl]="ctrl()"
				[rendered]="rendered()"
				[visible]="shown()"
				[direction]="direction()"
				[target]="target()"
				[width]="width()"
				[height]="height()"
				[closable]="closable()"
				[dismissible]="dismissible()"
				[placement]="placement()"
				[swipe]="swipe()"
				[contained]="contained()"
				[dismiss_enabled]="dismiss_enabled()"
				[hideOutside_enabled]="hideOutside_enabled()"
				[scrollLock_enabled]="scrollLock_enabled()"
				(soChangeVisible)="shown.set($event)"
			>
				<span slot="title">Фильтры</span>
				<p style="margin: 0 0 8px">Произвольное содержимое: текст, поля, кнопки</p>
				<div so-input placeholder="Поиск"></div>
				<button so-button slot="footer" text="Сбросить" (click)="shown.set(false)"></button>
				<button
					so-button
					slot="footer"
					text="Применить"
					(click)="shown.set(false)"
				></button>
			</div>
		</div>
	`,
})
export class DrawerPreview implements TFixture {
	readonly ctrl = input<TDrawerComponent['ctrl']>()
	readonly rendered = input<TDrawerComponent['rendered']>()
	readonly visible = input<TDrawerComponent['visible']>()
	readonly direction = input<TDrawerComponent['direction']>()
	readonly target = input<TDrawerComponent['target']>()
	readonly width = input<TDrawerComponent['width']>()
	readonly height = input<TDrawerComponent['height']>()
	readonly closable = input<TDrawerComponent['closable']>()
	readonly dismissible = input<TDrawerComponent['dismissible']>()
	readonly placement = input<TDrawerComponent['placement']>()
	readonly swipe = input<TDrawerComponent['swipe']>()
	readonly contained = input<TDrawerComponent['contained']>()
	readonly dismiss_enabled = input<TDrawerComponent['dismiss_enabled']>()
	readonly hideOutside_enabled = input<TDrawerComponent['hideOutside_enabled']>()
	readonly scrollLock_enabled = input<TDrawerComponent['scrollLock_enabled']>()
	/** Открытость панели — своя у превью, вход `visible` её переписывает. */
	readonly shown = linkedSignal(() => this.visible() ?? false)
	readonly subject = viewChild.required(TDrawerComponent)
}

/**
 * Своё содержимое тоста — кнопка «Отменить»: тост приходит ей входом `toast`
 * и закрывается ею. Коробки у компонента нет: кнопка встаёт в ряд своего
 * содержимого тоста, как кнопка, которую рисует компонент Vue.
 */
@Component({
	selector: 'pg-toast-undo',
	imports: [TButtonComponent],
	changeDetection: ChangeDetectionStrategy.OnPush,
	host: { style: 'display: contents' },
	template: `<button so-button text="Отменить" (click)="toast().close()"></button>`,
})
class ToastUndo {
	readonly toast = input.required<IToastsItem>()
}

/** Своё содержимое образцов тостов этого хоста. */
const undo: TToastRender = ToastUndo

/**
 * Тосты приходят из кода, а не из разметки: кнопки внутри менеджера берут API
 * (`useToasts()` полем) и показывают тост. Что сообщает тост, — образцы
 * стенда, одни на все хосты (`toastSample`), своё содержимое к ним — кнопка
 * «Отменить» этого хоста. Текст начинается с номера: в стопке видно, какой
 * тост где.
 *
 * Кнопка — на обычное сообщение и на каждый вид (`TOASTS_ITEM_TYPES`): тост
 * показывает значок своего вида. Последняя — ожидание: «Сохраняем…» с кольцом
 * на месте значка сам не закрывается, а через пару секунд тот же тост
 * сообщает успех. Ряд кнопок — с переносом, как у Vue.
 */
@Component({
	selector: 'pg-toasts-trigger',
	imports: [TButtonComponent],
	changeDetection: ChangeDetectionStrategy.OnPush,
	host: { style: 'display: contents' },
	template: `<div style="display: flex; flex-wrap: wrap; gap: 8px">
		<button so-button text="обычное" (click)="notify()"></button>
		@for (type of types; track type) {
			<button so-button [text]="type" (click)="notify(type)"></button>
		}
		<button so-button text="загрузка → готово" (click)="save()"></button>
	</div>`,
})
class ToastsTrigger {
	protected readonly types = TOASTS_ITEM_TYPES

	private readonly _toasts = useToasts()

	private _count = 0

	protected notify(type?: TToastsItemType): void {
		const sample = toastSample(type, undo)

		this._count += 1
		this._toasts.show({ ...sample, text: `${this._count}. ${sample.text}`, type })
	}

	// Работа идёт — тост ждёт; кончилась — тот же тост сообщает итог
	protected save(): void {
		this._count += 1

		const toast = this._toasts.show({ text: `${this._count}. Сохраняем…`, loading: true })
		const done = `${this._count}. Сохранено`

		setTimeout(() => {
			if (!toast) return

			toast.loading = false
			toast.type = 'success'
			toast.text = done
		}, TOAST_SAVING)
	}
}

/**
 * Toasts: менеджер вокруг ряда кнопок, которые показывают тосты, как у Vue, —
 * `<div so-toasts>` без своей коробки, а регион с тостами уехал к краю окна,
 * мимо ячейки превью. Кнопкам нужен API менеджера над ними (`useToasts()`), а
 * шаблон его отдаёт только разметке, поэтому превью — своим шаблоном.
 */
@Component({
	selector: 'pg-toasts-preview',
	imports: [TToastsComponent, ToastsTrigger],
	changeDetection: ChangeDetectionStrategy.OnPush,
	host: { style: 'display: contents' },
	template: `
		<div
			so-toasts
			[ctrl]="ctrl()"
			[rendered]="rendered()"
			[visible]="visible()"
			[direction]="direction()"
			[target]="target()"
			[placement]="placement()"
			[layout]="layout()"
			[max]="max()"
			[duration]="duration()"
		>
			<pg-toasts-trigger />
		</div>
	`,
})
export class ToastsPreview implements TFixture {
	readonly ctrl = input<TToastsComponent['ctrl']>()
	readonly rendered = input<TToastsComponent['rendered']>()
	readonly visible = input<TToastsComponent['visible']>()
	readonly direction = input<TToastsComponent['direction']>()
	readonly target = input<TToastsComponent['target']>()
	readonly placement = input<TToastsComponent['placement']>()
	readonly layout = input<TToastsComponent['layout']>()
	readonly max = input<TToastsComponent['max']>()
	readonly duration = input<TToastsComponent['duration']>()
	readonly subject = viewChild.required(TToastsComponent)
}

/**
 * DragAndDrop: перестановка у трёх коллекций сразу, на одном составе, как у
 * Vue и React, — `<ng-container so-drag-and-drop>` вокруг ряда. Tabs и
 * Accordion — частями разметки, ListBox — данными. Элемент переставляется в
 * своей коллекции: между коллекциями обёртка не переносит. Ряд — граница
 * ширины: табы — во всю ширину ряда, список и секции — под ними, рядом.
 * Первый таб активен сразу — иначе ни одна панель не смонтируется, — а
 * панели — слотом `content`, вне списка табов.
 */
@Component({
	selector: 'pg-drag-and-drop-preview',
	imports: [
		TDragAndDropComponent,
		TTabsComponent,
		TTabsItemComponent,
		TTabsContentComponent,
		TListBoxComponent,
		TAccordionComponent,
		TAccordionItemComponent,
	],
	changeDetection: ChangeDetectionStrategy.OnPush,
	host: { style: 'display: contents' },
	template: `
		<ng-container so-drag-and-drop [ctrl]="ctrl()">
			<div
				style="display: flex; flex-wrap: wrap; gap: 24px; align-items: flex-start; width: 100%"
			>
				<div style="flex: 1 1 100%; min-width: 0">
					<div so-tabs>
						@for (item of items; track item.value; let first = $first) {
							<div
								so-tabs-item
								[value]="item.value"
								[text]="item.text"
								[active]="first"
							></div>
						}
						@for (item of items; track item.value) {
							<div so-tabs-content slot="content" [value]="item.value">
								<div style="padding: 12px">Панель «{{ item.text }}»</div>
							</div>
						}
					</div>
				</div>
				<div so-list-box [items]="items" aria_label="Пункты"></div>
				<div style="flex: 1; min-width: 200px">
					<div so-accordion>
						@for (item of items; track item.value) {
							<div so-accordion-item [value]="item.value" [text]="item.text">
								<div style="padding: 4px 0">Содержимое «{{ item.text }}»</div>
							</div>
						}
					</div>
				</div>
			</div>
		</ng-container>
	`,
})
export class DragAndDropPreview implements TFixture {
	readonly ctrl = input<TDragAndDropComponent['ctrl']>()
	readonly subject = viewChild.required(TDragAndDropComponent)
	/** Состав коллекций — из общего манифеста, как у Vue и React. */
	protected readonly items = COLLECTION_ITEMS
}

/**
 * Virtual: окно на списке и таблице по тысяче элементов — на пяти его не
 * видно, — `<ng-container so-virtual>` вокруг ряда. ListBox с пределом строк
 * прокручивается сам, таблица — в окне прокрутки высотой 320 px; строка
 * `enabled` включает и выключает окно у обоих. Элементы — данными (`items`):
 * элементы разметкой окно не прячет. Ряд — граница ширины, как у Vue и React.
 * Select в Angular нет, и его окна рядом тоже. Переставленную колонку таблица
 * ведёт целиком, с ячейками строк (`reorderPreview="column"`): в окне это
 * сотни ячеек, а не тысячи.
 */
@Component({
	selector: 'pg-virtual-preview',
	imports: [TVirtualComponent, TListBoxComponent, TTableComponent],
	changeDetection: ChangeDetectionStrategy.OnPush,
	host: { style: 'display: contents' },
	template: `
		<ng-container so-virtual [ctrl]="ctrl()" [enabled]="enabled()">
			<div style="display: flex; gap: 24px; align-items: flex-start; width: 100%">
				<div so-list-box [items]="items" [maxRows]="8" aria_label="Пункты"></div>
				<div style="flex: 1; min-width: 0; height: 320px; overflow: auto">
					<div
						so-table
						[items]="rows"
						[columns]="columns"
						reorderPreview="column"
						aria_label="Сотрудники"
					></div>
				</div>
			</div>
		</ng-container>
	`,
})
export class VirtualPreview implements TFixture {
	readonly ctrl = input<TVirtualComponent['ctrl']>()
	readonly enabled = input<TVirtualComponent['enabled']>()
	readonly subject = viewChild.required(TVirtualComponent)
	protected readonly items = COLLECTION_MANY_ITEMS
	protected readonly rows = TABLE_MANY_ROWS
	protected readonly columns = TABLE_COLUMNS
}
