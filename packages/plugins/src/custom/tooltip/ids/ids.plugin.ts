import type { ITooltip, TTooltipType } from '@soldy-ui/core'
import { TBasePlugin } from '../../../base'
import type { IPluginContext } from '../../../base'

/**
 * Атрибут, которым триггер ссылается на панель, — по режиму. Словарь по
 * union, а не условие: режим без своей ссылки не скомпилируется.
 */
const TRIGGER_RELATION: Record<TTooltipType, string> = {
	description: 'aria-describedby',
	label: 'aria-labelledby',
}

/**
 * TTooltipIdsPlugin — связка «триггер ↔ панель» подсказки в документе.
 *
 * `id` панели — в `aria` подсказки, который разметка раскладывает на панель,
 * а ссылка триггера на него — в `triggerAria`: `aria-describedby`, в режиме
 * `label` — `aria-labelledby`. Ссылка одна, не обе: подсказка-имя,
 * повторённая описанием, прозвучала бы дважды. Сменился режим (`change:type`)
 * — прежняя ссылка снимается, новая ставится.
 *
 * `id` — от монтирования (`createId`), а не от экземпляра: он нужен только
 * документу, и на сервере и в браузере обязан совпасть. Пишется при
 * установке, синхронно: панель не размонтируется, и описание или имя есть уже
 * в первой (и серверной) отрисовке.
 */
export class TTooltipIdsPlugin extends TBasePlugin {
	private _panelId = ''

	override install(ctx: IPluginContext): void {
		super.install(ctx)

		const tooltip = ctx.getInstance<ITooltip>()

		if (!tooltip) return

		this._panelId = ctx.createId('panel')

		tooltip.aria.add('id', this._panelId)

		this._link(tooltip, tooltip.type)
		this._listenTo(tooltip.events, 'change:type', (type) => this._link(tooltip, type))
	}

	/** Ссылка триггера по режиму: ровно одна из двух. */
	private _link(tooltip: ITooltip, type: TTooltipType): void {
		for (const [mode, relation] of Object.entries(TRIGGER_RELATION)) {
			tooltip.triggerAria.add(relation, mode === type ? this._panelId : null)
		}
	}
}
