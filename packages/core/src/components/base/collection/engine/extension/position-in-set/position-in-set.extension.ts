import type { IExtension, IExtensionContext } from '../types'
import { TBaseExtension } from '../base-extension.class'
import { batchOf, drawOf } from '../neighbours'
import type { IPositionInSetExtension, TPositionable, TPositionInSetEvents } from './types'

/**
 * TPositionInSetExtension — место элемента в наборе, пока коллекцию рисует окно.
 *
 * В окне (обёртка `Virtual`) в документе не все показанные элементы, и
 * посчитать набор скринридер по документу не может: «2 из 7» он объявил бы по
 * нарисованным. Поэтому нарисованным расширение пишет размер набора и место в
 * нём (`aria-setsize`, `aria-posinset`, с единицы) — как велит APG для списка,
 * часть которого не в документе. Размер — все показанные, место — среди них.
 * Ушедшие из окна и все без окна их теряют: без окна в документе весь набор, и
 * счёт браузера верен.
 *
 * Общее у коллекций, чьи элементы — опции списка (`option`): ListBox и Select.
 * У строк таблицы место своё — номер строки среди строк таблицы
 * (`aria-rowindex`), и пишет его окно таблицы.
 *
 * Соседей — состав и рисование — узнаёт по контракту и ставится сразу после
 * `draw`: на смену показанных рисование уже пересчитано.
 */
export class TPositionInSetExtension<TItem extends TPositionable = any>
	extends TBaseExtension<TItem, TPositionInSetEvents>
	implements IExtension<TItem>, IPositionInSetExtension<TItem>
{
	readonly name = 'positionInSet' as const

	/** Элементы, которым окно написало место в наборе: ушедшим из окна его снимают. */
	private _positioned = new Set<TItem>()

	override install(ctx: IExtensionContext<TItem>): void {
		super.install(ctx)

		// Окно сменило, что рисует, или его поставили и сняли; сменились
		// показанные — сменился и размер набора
		const draw = drawOf(ctx)

		draw?.events.on('change:drawn', () => this._apply())
		draw?.events.on('change:virtual', () => this._apply())
		batchOf(ctx)?.events.on('change:shown', () => this._apply())

		this._apply()
	}

	/**
	 * Размер набора и место в нём — нарисованным элементам, пока стоит окно.
	 * Ушедшие из окна и все без окна — снять.
	 */
	private _apply(): void {
		const draw = drawOf(this._ctx)
		const places = new Map<TItem, number>()

		if (draw?.virtual) {
			for (const entry of draw.drawn) {
				if (entry.kind === 'item') places.set(entry.item, entry.place)
			}
		}

		if (places.size > 0) {
			const size = String(batchOf(this._ctx)?.shown.length ?? 0)

			for (const [item, place] of places) {
				item.aria.add('aria-setsize', size)
				item.aria.add('aria-posinset', String(place + 1))
			}
		}

		for (const item of this._positioned) {
			if (places.has(item)) continue

			item.aria.add('aria-setsize', null)
			item.aria.add('aria-posinset', null)
		}

		this._positioned = new Set(places.keys())
	}
}
