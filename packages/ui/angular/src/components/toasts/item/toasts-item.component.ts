import { Component, ChangeDetectionStrategy } from '@angular/core'
import { NgComponentOutlet, NgTemplateOutlet } from '@angular/common'
import type { IToastsItem, TToastsItemCollectionFacade, TToastsItemType } from '@soldy-ui/core'
import type { TIconRole } from '@soldy-ui/setup'
import {
	AttributesDirective,
	RoleIconDirective,
	isToastRender,
	type TBinding,
	type TToastRender,
} from '../../../adapter'
import { TButtonComponent } from '../../button'
import { TIconComponent } from '../../icon'
import { TProgressSpinnerComponent } from '../../progress-spinner'
import { ToastsItemInputNames, TToastsItemSurface } from './base.component'
import { setupToastsItem } from './setup.component'

/**
 * Значок вида — по роли, своей у каждого вида: в режиме принудительных цветов
 * вид различает только глиф. Роль выбирает разметка, как у Vue, тема значок
 * только красит. Таблица закрыта по виду (`satisfies`): новый вид без своего
 * значка не соберётся.
 */
const TYPE_ROLES = {
	info: 'info',
	success: 'success',
	warning: 'warning',
	error: 'error',
} satisfies Record<TToastsItemType, TIconRole>

/** Значок обычного сообщения — тоста без вида. */
const NOTIFICATION_ROLE: TIconRole = 'notification'

/**
 * TToastsItemComponent — тост: внутренняя часть менеджера, как страница у
 * пагинации. Его рисует только регион `TToastsComponent`, по одному на
 * каждый показанный элемент коллекции, потребитель его в разметку не ставит,
 * и из пакета он не выходит.
 *
 * Корень — место тоста в списке, `<li so-toasts-item>`: высота места, сдвиг
 * жеста, уход и прозрачность (тема). Классы (вид сообщения
 * `so-toasts-item--type-*`), все три набора ядра (роль `status` или `alert`,
 * `tabindex` — фокус по F8 и Escape, `data-open`, `data-swiping`) и глубину в
 * стопке раскладывает на него `TComponentBase` (стратегия `'host'`): `order`
 * фасада — место тоста в составе — ложится в переменную `--so-toasts-depth`
 * (`TRootSpec.order`), как `:style` корня у Vue, а CSS-свойства `order` у тоста
 * нет. Сдвиг во время жеста (`--so-swipe-offset`) плагин жеста пишет в корень
 * сам. Атрибутов потребителя у тоста нет: ставит его только регион.
 *
 * Шаблон — то, что у Vue, в том же порядке: плашка, в ней коробка значка
 * (кольцо, пока тост ждёт; шаблон слота `icon`; значок вида по роли), текст,
 * описание, своё содержимое и крестик. Своё содержимое — шаблон слота
 * `content`, а без него — компонент `render` тоста, выводом компонента
 * (`NgComponentOutlet`) со входом `toast`, только когда это компонент
 * (`isToastRender`). Крестик есть, только пока тост можно им закрыть (`@if`, а
 * не `rendered` кнопки: скрытая кнопка со своими плагинами стояла бы в каждом
 * тосте), нажатие — `close()` тоста.
 *
 * Слоты тоста пробрасывает регион из своих `item-*` — шаблонами
 * (`<ng-template slot>`), в слив в конце шаблона: в основной проекции они
 * сняли бы запасной текст. Шаблон непрозрачен — что он нарисовал, тост не
 * видит, — и заданный регионом шаблон рисуется вместо своего у каждого тоста,
 * даже пустой.
 *
 * Selector: li[so-toasts-item], [so-toasts-item]
 */
@Component({
	selector: 'li[so-toasts-item], [so-toasts-item]',
	standalone: true,
	imports: [
		NgComponentOutlet,
		NgTemplateOutlet,
		AttributesDirective,
		RoleIconDirective,
		TButtonComponent,
		TIconComponent,
		TProgressSpinnerComponent,
	],
	changeDetection: ChangeDetectionStrategy.OnPush,
	templateUrl: './toasts-item.component.html',
})
export class TToastsItemComponent extends TToastsItemSurface<IToastsItem> {
	constructor() {
		super(ToastsItemInputNames, { strategy: 'host', order: '--so-toasts-depth' })
	}

	protected createBinding(
		ctrl: IToastsItem | undefined,
		inputs: object,
	): TBinding<IToastsItem, TToastsItemCollectionFacade> {
		return setupToastsItem(ctrl, inputs)
	}

	/** Роль значка вида; у обычного сообщения — своя. */
	protected typeRole(): TIconRole {
		const type = this.state()['type']

		return type ? TYPE_ROLES[type] : NOTIFICATION_ROLE
	}

	/** Своё содержимое тоста, когда это компонент Angular (`isToastRender`); иначе его нет. */
	protected contentComponent(): TToastRender | null {
		const render: unknown = this.state()['render']

		return isToastRender(render) ? render : null
	}

	/** Нажатие крестика: тост закрывается — окончательно, как жестом и Escape. */
	protected close(): void {
		this.instance()?.close()
	}
}
