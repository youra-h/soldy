import { TBatchCollectionFacade } from '../../../../base/collection'
import type {
	TCollectionEngine,
	TCollectionFacadeOptions,
	TCollectionFacadeProps,
} from '../../../../base/collection'
import { completeEngine } from '../../../../base/collection/create/internal'
import type { TCalendarDate } from '../../../../../common'
import type { ICalendarItem } from '../../item/types'
import type { ICalendar } from '../../types'
import type { TCalendarGrid, TCalendarMode } from '../extensions'
import { calendarExtensions } from '../factory'
import type {
	ICalendarCollectionProps,
	TCalendarCollectionExtensions,
	TCalendarCollectionFacadeEngine,
	TCalendarCollectionFacadeEvents,
} from '../types'

/**
 * Фасад коллекции календаря.
 *
 * Состав — из базы с `batch`, остальное — проекция трёх расширений
 * календаря: сетки и листание (`view`), режим, якорь и день под указателем
 * (`selection`), день с фокусом (`focus`). Своего фасад не делает ничего:
 * события расширений он отдаёт наружу `relayAll`, команды остаются у них.
 *
 * База — `TBatchCollectionFacade`, а не `TSelectionCollectionFacade`:
 * иерархия фасадов повторяет состав расширений, а стандартного выбора у
 * календаря нет.
 */
export class TCalendarCollectionFacade extends TBatchCollectionFacade<
	ICalendarItem,
	TCalendarCollectionExtensions,
	TCalendarCollectionFacadeEvents
> {
	constructor(
		props: TCollectionFacadeProps<ICalendarItem> & ICalendarCollectionProps = {},
		options: TCollectionFacadeOptions<TCalendarCollectionFacadeEngine, ICalendar> = {},
	) {
		super(
			{},
			{
				engine: completeEngine(options.engine, calendarExtensions()) as TCollectionEngine<
					ICalendarItem,
					TCalendarCollectionExtensions
				>,
				owner: options.owner,
			},
		)

		if (!options.engine) this.bindOwner()

		this.events.relayAll(this.extensions.view.events)
		this.events.relayAll(this.extensions.selection.events)
		this.events.relayAll(this.extensions.focus.events)

		this.applyProps(props)
	}

	/** Режим — до состава: как у фасадов со стандартным выбором. */
	protected override applyProps(
		props: TCollectionFacadeProps<ICalendarItem> & ICalendarCollectionProps,
	): void {
		if (props.mode) this.mode = props.mode

		super.applyProps(props)
	}

	get mode(): TCalendarMode {
		return this.extensions.selection.mode
	}

	set mode(value: TCalendarMode) {
		this.extensions.selection.mode = value
	}

	get grids(): TCalendarGrid[] {
		return this.extensions.view.grids
	}

	get prevDisabled(): boolean {
		return this.extensions.view.prevDisabled
	}

	get nextDisabled(): boolean {
		return this.extensions.view.nextDisabled
	}

	get focusedDate(): TCalendarDate {
		return this.extensions.focus.focusedDate
	}

	get anchor(): TCalendarDate | undefined {
		return this.extensions.selection.anchor
	}
}
