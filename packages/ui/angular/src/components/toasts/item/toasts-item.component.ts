import { Component, ChangeDetectionStrategy } from '@angular/core'
import { NgComponentOutlet, NgTemplateOutlet } from '@angular/common'
import type { IToastsItem, TToastsItemType } from '@soldy-ui/core'
import type { TIconRole } from '@soldy-ui/setup'
import {
	AttributesDirective,
	RoleIconDirective,
	isToastRender,
	type TToastRender,
} from '../../../adapter'
import { TButtonComponent } from '../../button'
import { TIconComponent } from '../../icon'
import { TProgressSpinnerComponent } from '../../progress-spinner'
import { TToastsItemSurface } from '../../../generated/toasts-item.metadata'
import { setupToastsItem } from './setup.component'

/** Значок вида — по роли: в режиме принудительных цветов вид различает только глиф. */
const TYPE_ROLES = {
	info: 'info',
	success: 'success',
	warning: 'warning',
	error: 'error',
} satisfies Record<TToastsItemType, TIconRole>

/** Значок обычного сообщения — тоста без вида. */
const NOTIFICATION_ROLE: TIconRole = 'notification'

/** Тост — внутренняя часть менеджера: рисует его только регион `TToastsComponent`. */
@Component({
	selector: 'li[so-toasts-item], [so-toasts-item]',
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
		super(setupToastsItem, { strategy: 'host', order: '--so-toasts-depth' })
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
}
