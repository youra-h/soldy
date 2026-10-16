import type { IRating } from '@soldy-ui/core'
import { TBasePlugin } from '../../../base'
import type { IPluginContext } from '../../../base'
import { TElementPlugin } from '../../element'
import type { IDomEventTarget } from '../../../utils'
import { fractionAt, slideDirection } from '../../slide/direction'
import { trackOf } from '../../slide/parts'
import type { TRatingHoverPluginEvents } from './types'

/**
 * TRatingHoverPlugin — наведение на оценку: предпросмотр той оценки, которую
 * поставит нажатие под указателем.
 *
 * Операция над DOM — здесь, значение — у владельца. Плагин переводит точку
 * указателя в долю ряда по коробке дорожки — тем же счётом, что указатель
 * перетаскивания (`slideDirection`, `fractionAt`): в RTL ряд растёт справа, —
 * и зовёт `hover` владельца. Какую оценку показать, решает владелец: он
 * округляет долю к шагу так же, как нажатие, и не показывает предпросмотра,
 * когда оценку менять нельзя.
 *
 * Слушает корень, как указатель перетаскивания: нажатие ловит он же, и
 * предпросмотр показывает ровно то, что поставит нажатие в этой точке.
 *
 * Наведение — не касание: палец над звездой — это уже нажатие, а
 * предпросмотр после него остался бы висеть. Указатель ушёл с корня или
 * корня не стало — предпросмотра нет.
 */
export class TRatingHoverPlugin extends TBasePlugin<IRating, TRatingHoverPluginEvents> {
	private _owner: IRating | null = null
	private _root: Element | null = null

	override install(ctx: IPluginContext, options?: unknown): void {
		super.install(ctx, options)

		this._owner = ctx.getInstance<IRating>()

		const element = ctx.get(TElementPlugin)

		element?.events.on('ready', (node) => this._attach(node))
		element?.events.on('removed', () => this._detach())
	}

	override destroy(): void {
		this._detach()
		this._owner = null

		super.destroy()
	}

	private _attach(root: Element): void {
		this._detach()

		this._root = root

		const target: IDomEventTarget = root

		target.addEventListener('pointermove', this._onPointerMove)
		target.addEventListener('pointerleave', this._onPointerLeave)
	}

	/**
	 * Снять слушатели — и предпросмотр: у оценки без узла указателя над
	 * звёздами нет, а свой `ctrl` переживает размонтирование.
	 */
	private _detach(): void {
		const target: IDomEventTarget | null = this._root

		if (!target) return

		target.removeEventListener('pointermove', this._onPointerMove)
		target.removeEventListener('pointerleave', this._onPointerLeave)

		this._root = null
		this._owner?.hover(undefined)
	}

	private readonly _onPointerMove = (event: PointerEvent): void => {
		const owner = this._owner
		const root = this._root

		if (!owner || !root || event.pointerType === 'touch') return

		const track = trackOf(owner, root)

		if (!track) return

		owner.hover(fractionAt(slideDirection(owner, root), track.getBoundingClientRect(), event))
	}

	private readonly _onPointerLeave = (): void => {
		this._owner?.hover(undefined)
	}
}
