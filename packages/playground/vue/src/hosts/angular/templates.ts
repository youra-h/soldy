import {
	ChangeDetectionStrategy,
	Component,
	Directive,
	input,
	linkedSignal,
	viewChild,
	viewChildren,
} from '@angular/core'
import type { IToastsItem, TToastsItemType } from '@soldy-ui/core'
import {
	AttributesDirective,
	SlotDirective,
	TAccordionComponent,
	TAccordionItemComponent,
	TButtonComponent,
	TCalendarComponent,
	TDialogComponent,
	TDragAndDropComponent,
	TDrawerComponent,
	TInputComponent,
	TListBoxComponent,
	TMenuCheckboxItemComponent,
	TMenuComponent,
	TMenuGroupComponent,
	TMenuItemComponent,
	TMenuPopoverItemComponent,
	TMenuRadioGroupComponent,
	TMenuRadioItemComponent,
	TMenuSeparatorComponent,
	TMenuSubmenuComponent,
	TPopoverComponent,
	TSelectComponent,
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
import { CopyDirective } from './copy.directive'
import type { TFixture } from './fixtures'

/**
 * Previews whose markup needs slot templates, state of their own or a
 * directive — in Angular.
 *
 * The trigger of a popover and a tooltip is a slot template with a scope
 * (`<ng-template slot="trigger">`). A dialog and a drawer need a button that
 * opens them, an open state of their own and parts by slots, as the Vue
 * preview has. A component without a root — the virtual window and the
 * reordering — is a directive on `<ng-container>`. The trigger and the content
 * are those of the Vue preview (`hosts/vue/previews.ts`).
 *
 * Like every preview of the host (`previews.ts`), the preview takes the shell's
 * props as its inputs and passes them to the component in its markup with
 * bindings — an input for every prop the page writes, and `ctrl`. The input's
 * type is the type of the adapter component's field, and a removed prop comes
 * to the input as `undefined`, so the property returns to its default. The
 * host does not mute a prop without an input: a prop that appeared in the
 * descriptor and did not get here is an error on its page. The markup is one
 * copy (`<ng-template pg-copy>`), and the component in it goes to the host
 * (`subjects`): the host listens to its outputs.
 */

/**
 * Popover: the trigger is a Button that puts the link to the panel and the
 * pressed look on itself with the set directive. The content has a button:
 * focus goes to it on open. The content is the `default` template, as the
 * slot of the Vue preview: a projection would be created right away, and the
 * `lazyMount` row would only keep it out of the document.
 */
@Component({
	selector: 'pg-popover-preview',
	imports: [
		TPopoverComponent,
		TButtonComponent,
		SlotDirective,
		AttributesDirective,
		CopyDirective,
	],
	changeDetection: ChangeDetectionStrategy.OnPush,
	host: { style: 'display: contents' },
	template: `
		<ng-template pg-copy>
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
				<ng-template slot="default">
					<p style="margin: 0 0 8px">Произвольное содержимое: текст, поля, кнопки</p>
					<button so-button text="Действие"></button>
				</ng-template>
			</span>
		</ng-template>
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
	readonly copy = viewChild.required(CopyDirective)
	readonly subjects = viewChildren(TPopoverComponent)
}

/**
 * Tooltip: триггер — Button, ссылку на панель (`aria-describedby`) он кладёт
 * на себя директивой набора. Текст подсказки — содержимым: пропа текста у неё
 * нет.
 */
@Component({
	selector: 'pg-tooltip-preview',
	imports: [
		TTooltipComponent,
		TButtonComponent,
		SlotDirective,
		AttributesDirective,
		CopyDirective,
	],
	changeDetection: ChangeDetectionStrategy.OnPush,
	host: { style: 'display: contents' },
	template: `
		<ng-template pg-copy>
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
		</ng-template>
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
	readonly copy = viewChild.required(CopyDirective)
	readonly subjects = viewChildren(TTooltipComponent)
}

/**
 * The inputs of a menu preview — one for every prop the page writes, and
 * `ctrl` — and the menu in each copy (`subjects`): shared by the menu with
 * items in markup and the menu from data (`MenuPreview`, `MenuItemsPreview`).
 */
@Directive()
abstract class TMenuPreviewInputs implements TFixture {
	readonly ctrl = input<TMenuComponent['ctrl']>()
	readonly engine = input<TMenuComponent['engine']>()
	readonly items = input<TMenuComponent['items']>()
	readonly groups = input<TMenuComponent['groups']>()
	readonly groupBy = input<TMenuComponent['groupBy']>()
	readonly rendered = input<TMenuComponent['rendered']>()
	readonly visible = input<TMenuComponent['visible']>()
	readonly direction = input<TMenuComponent['direction']>()
	readonly size = input<TMenuComponent['size']>()
	readonly variant = input<TMenuComponent['variant']>()
	readonly open = input<TMenuComponent['open']>()
	readonly placement = input<TMenuComponent['placement']>()
	readonly openOn = input<TMenuComponent['openOn']>()
	readonly groupSeparators = input<TMenuComponent['groupSeparators']>()
	readonly dismiss_enabled = input<TMenuComponent['dismiss_enabled']>()
	readonly copy = viewChild.required(CopyDirective)
	readonly subjects = viewChildren(TMenuComponent)
}

/**
 * Привязки меню превью ко входам превью, кроме состава — одни у обоих меню.
 * Состав (`items`) отдаёт только меню из данных: у меню разметкой его заменяет
 * разметка.
 */
const MENU_BINDINGS = `
	[ctrl]="ctrl()"
	[engine]="engine()"
	[groups]="groups()"
	[groupBy]="groupBy()"
	[rendered]="rendered()"
	[visible]="visible()"
	[direction]="direction()"
	[size]="size()"
	[variant]="variant()"
	[open]="open()"
	[placement]="placement()"
	[openOn]="openOn()"
	[groupSeparators]="groupSeparators()"
	[dismiss_enabled]="dismiss_enabled()"
`

/**
 * Триггер меню — Button, связку с меню и вид «нажата» он кладёт на себя
 * директивой набора. У контекстного меню (`openOn: 'contextmenu'`) в слоте
 * область, как «файл» у потребителя: меню вызывают над ней правой кнопкой,
 * долгим касанием и Shift+F10, и панель встаёт у точки вызова. Область —
 * нативная кнопка, как у Vue: под фокусом для Shift+F10, со своими ролью и
 * именем и без связки с меню. Режим область берёт из пропсов колонки: у
 * колонки экземпляра его нет, и там меню вызывают над кнопкой.
 */
const MENU_TRIGGER = `
	<ng-template slot="trigger" let-triggerAria="triggerAria" let-triggerDataset="triggerDataset">
		@if (openOn() === 'contextmenu') {
			<button type="button" style="padding: 24px 32px; border: 1px dashed; border-radius: 8px">
				Правая кнопка, долгое касание или Shift+F10
			</button>
		} @else {
			<button
				so-button
				text="Действия"
				[so-attributes]="{ ...triggerAria, ...triggerDataset }"
			></button>
		}
	</ng-template>
`

/**
 * Menu: items in markup, as in Vue — a group of checkboxes with a label, a
 * group of radios with one checked, actions with shortcut hints, a submenu
 * with a submenu inside, an item with a panel — a calendar mounted with the
 * first opening, — a disabled action and a "dangerous" item of its own variant.
 * The items of the menu and of each submenu are their `default` template, as a
 * consumer who wants them lazy writes them: the menu creates it with the first
 * opening of its panel, while a projection Angular would create with the menu.
 *
 * When the items came as data (`items` of the page's groups block and of the
 * `groupSeparators` row preset), the preview is another one, `MenuItemsPreview`:
 * markup would replace the data, and the menu draws groups from data. Not
 * `@if` around the items: Angular picks the fallback content of `<ng-content>`
 * once, and an `@if` in the content takes the projection even with a false
 * condition. Nor a second menu in an `@else` branch: the host listens to the
 * outputs of the menu in each copy (`subjects`) as soon as the copies are
 * created, before the first check, and a menu in a branch would appear only in
 * that check. So the host picks the preview when it places it (`templateFor`).
 */
@Component({
	selector: 'pg-menu-preview',
	imports: [
		TMenuComponent,
		TMenuItemComponent,
		TMenuCheckboxItemComponent,
		TMenuRadioGroupComponent,
		TMenuRadioItemComponent,
		TMenuGroupComponent,
		TMenuSeparatorComponent,
		TMenuSubmenuComponent,
		TMenuPopoverItemComponent,
		TCalendarComponent,
		TButtonComponent,
		SlotDirective,
		AttributesDirective,

		CopyDirective,
	],
	changeDetection: ChangeDetectionStrategy.OnPush,
	host: { style: 'display: contents' },
	template: `
		<ng-template pg-copy>
			<span so-menu ${MENU_BINDINGS}>
				${MENU_TRIGGER}
				<ng-template slot="default">
					<div so-menu-group label="Вид">
						<div so-menu-checkbox-item value="grid" text="Сетка" selected></div>
						<div so-menu-checkbox-item value="ruler" text="Линейка"></div>
					</div>
					<div so-menu-separator></div>
					<div so-menu-radio-group label="Сортировка" value="name">
						<div so-menu-radio-item value="name" text="По имени"></div>
						<div so-menu-radio-item value="date" text="По дате"></div>
					</div>
					<div so-menu-separator></div>
					<div so-menu-item value="edit" text="Изменить">
						<span slot="trailing">Ctrl+E</span>
					</div>
					<div so-menu-item value="copy" text="Дублировать">
						<span slot="trailing">Ctrl+D</span>
					</div>
					<div so-menu-submenu value="share" text="Поделиться">
						<ng-template slot="default">
							<div so-menu-item value="link" text="Ссылка"></div>
							<div so-menu-item value="mail" text="Почта"></div>
							<div so-menu-submenu value="messengers" text="Мессенджеры">
								<ng-template slot="default">
									<div so-menu-item value="telegram" text="Telegram"></div>
									<div so-menu-item value="whatsapp" text="WhatsApp"></div>
								</ng-template>
							</div>
						</ng-template>
					</div>
					<div so-menu-popover-item value="due" text="Срок" lazyMount>
						<ng-template slot="default"><div so-calendar></div></ng-template>
					</div>
					<div so-menu-item value="archive" text="В архив" disabled></div>
					<div so-menu-separator></div>
					<div so-menu-item value="remove" text="Удалить" variant="negative">
						<span slot="trailing">Del</span>
					</div>
				</ng-template>
			</span>
		</ng-template>
	`,
})
export class MenuPreview extends TMenuPreviewInputs {}

/**
 * Menu из данных: состав — `items` блока групп страницы или пресета строки
 * `groupSeparators`, — и пунктов разметкой нет: меню рисует свои по секциям
 * групп. Триггер — тот же, что у `MenuPreview`.
 */
@Component({
	selector: 'pg-menu-items-preview',
	imports: [TMenuComponent, TButtonComponent, SlotDirective, AttributesDirective, CopyDirective],
	changeDetection: ChangeDetectionStrategy.OnPush,
	host: { style: 'display: contents' },
	template: `
		<ng-template pg-copy>
			<span so-menu [items]="items()" ${MENU_BINDINGS}> ${MENU_TRIGGER} </span>
		</ng-template>
	`,
})
export class MenuItemsPreview extends TMenuPreviewInputs {}

/**
 * Dialog: on the stand a button opens the dialog, as in Vue: a closed dialog is
 * hidden, and an open one covers the page with a backdrop, so showing it right
 * away would be unfair to the rest of the page.
 *
 * Whether it is open is the own state of a copy (`state`, the context of
 * its view): a signal the `visible` input overwrites (`linkedSignal`), as
 * `v-model:visible` on its own state in Vue. The cross, Escape and the
 * backdrop close the dialog through `(soChangeVisible)`, the footer buttons by
 * writing the signal, and the `visible` row sets it from outside. With a core
 * instance (the second column) the path is the same: writing `visible` of the
 * instance opens the dialog, and the output reaches here. Every copy opens its
 * own dialog.
 */
@Component({
	selector: 'pg-dialog-preview',
	imports: [TDialogComponent, TButtonComponent, TInputComponent, CopyDirective],
	changeDetection: ChangeDetectionStrategy.OnPush,
	host: { style: 'display: contents' },
	template: `
		<ng-template pg-copy [pg-copy-state]="state" let-shown="shown">
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
				<button
					so-button
					slot="footer"
					text="Сохранить"
					(click)="shown.set(false)"
				></button>
			</div>
		</ng-template>
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
	/**
	 * The own state of a copy: whether its dialog is open; the `visible` input
	 * overwrites it.
	 */
	readonly state = () => ({ shown: linkedSignal(() => this.visible() ?? false) })
	readonly copy = viewChild.required(CopyDirective)
	readonly subjects = viewChildren(TDialogComponent)
}

/**
 * Drawer: a button opens the drawer too — for the same reason as the dialog,
 * and on the same own state of a copy (see `DialogPreview`).
 *
 * The button and the drawer lie in a box of their own with
 * `position: relative`, as in Vue: with `contained` the drawer does not leave
 * but stands in the nearest positioned ancestor, and the `contained` row shows
 * it in the preview's box rather than at the edge of the whole page.
 */
@Component({
	selector: 'pg-drawer-preview',
	imports: [TDrawerComponent, TButtonComponent, TInputComponent, CopyDirective],
	changeDetection: ChangeDetectionStrategy.OnPush,
	host: { style: 'display: contents' },
	template: `
		<ng-template pg-copy [pg-copy-state]="state" let-shown="shown">
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
					<button
						so-button
						slot="footer"
						text="Сбросить"
						(click)="shown.set(false)"
					></button>
					<button
						so-button
						slot="footer"
						text="Применить"
						(click)="shown.set(false)"
					></button>
				</div>
			</div>
		</ng-template>
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
	/**
	 * The own state of a copy: whether its drawer is open; the `visible` input
	 * overwrites it.
	 */
	readonly state = () => ({ shown: linkedSignal(() => this.visible() ?? false) })
	readonly copy = viewChild.required(CopyDirective)
	readonly subjects = viewChildren(TDrawerComponent)
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
	imports: [TToastsComponent, ToastsTrigger, CopyDirective],
	changeDetection: ChangeDetectionStrategy.OnPush,
	host: { style: 'display: contents' },
	template: `
		<ng-template pg-copy>
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
		</ng-template>
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
	readonly copy = viewChild.required(CopyDirective)
	readonly subjects = viewChildren(TToastsComponent)
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

		CopyDirective,
	],
	changeDetection: ChangeDetectionStrategy.OnPush,
	host: { style: 'display: contents' },
	template: `
		<ng-template pg-copy>
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
		</ng-template>
	`,
})
export class DragAndDropPreview implements TFixture {
	readonly ctrl = input<TDragAndDropComponent['ctrl']>()
	readonly copy = viewChild.required(CopyDirective)
	readonly subjects = viewChildren(TDragAndDropComponent)
	/** Состав коллекций — из общего манифеста, как у Vue и React. */
	protected readonly items = COLLECTION_ITEMS
}

/**
 * Virtual: окно на трёх списках по тысяче элементов — на пяти его не видно, —
 * `<ng-container so-virtual>` вокруг ряда. ListBox с пределом строк
 * прокручивается сам, у Select прокручивается список его панели, таблица — в
 * окне прокрутки высотой 320 px; строка `enabled` включает и выключает окно у
 * всех разом. Элементы — данными (`items`): элементы разметкой окно не прячет.
 * Ряд — граница ширины, как у Vue и React, а Select — в колонке своей ширины:
 * поле во всю ширину места, и в ряду оно забрало бы место таблицы.
 * Переставленную колонку таблица ведёт целиком, с ячейками строк
 * (`reorderPreview="column"`): в окне это сотни ячеек, а не тысячи.
 */
@Component({
	selector: 'pg-virtual-preview',
	imports: [
		TVirtualComponent,
		TListBoxComponent,
		TSelectComponent,
		TTableComponent,
		CopyDirective,
	],
	changeDetection: ChangeDetectionStrategy.OnPush,
	host: { style: 'display: contents' },
	template: `
		<ng-template pg-copy>
			<ng-container so-virtual [ctrl]="ctrl()" [enabled]="enabled()">
				<div style="display: flex; gap: 24px; align-items: flex-start; width: 100%">
					<div so-list-box [items]="items" [maxRows]="8" aria_label="Пункты"></div>
					<div style="flex: none; width: 220px">
						<div so-select [items]="items" placeholder="Выберите"></div>
					</div>
					<div style="flex: 1; min-width: 0; height: 320px; overflow: auto">
						<div
							so-table
							[items]="rows"
							[columns]="columns"
							reorderPreview="column"
							[resizable]="true"
							[reorderable]="true"
							aria_label="Сотрудники"
						></div>
					</div>
				</div>
			</ng-container>
		</ng-template>
	`,
})
export class VirtualPreview implements TFixture {
	readonly ctrl = input<TVirtualComponent['ctrl']>()
	readonly enabled = input<TVirtualComponent['enabled']>()
	readonly copy = viewChild.required(CopyDirective)
	readonly subjects = viewChildren(TVirtualComponent)
	protected readonly items = COLLECTION_MANY_ITEMS
	protected readonly rows = TABLE_MANY_ROWS
	protected readonly columns = TABLE_COLUMNS
}
