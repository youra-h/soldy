import type { ICalendar, TCalendarCollection } from '@soldy-ui/core'
import { TNamesPlugin } from '../../../locale/names.plugin'
import type { IPluginContext } from '../../../base'
import type { TTranslations } from '../../../locale/types'
import { TCollectionBundlesPlugin } from '../../collection'

/**
 * TCalendarNamesPlugin — имена кнопок календаря от локали.
 *
 * Кнопки листания месяцев — в наборы календаря (`prevAria`, `nextAria`).
 * Стрелки панели выбора месяца и года — в наборы мест панели
 * (`pickerSets` расширения `picker`), по уровню места: на месяцах стрелка
 * листает год, на годах — страницу из 12 лет. Уровень сменился, мест стало
 * больше (`change:pickers`) — имена переписываются; та же строка в наборе
 * ничего не меняет, поэтому запись из этого события в него же не
 * возвращается.
 *
 * Движок привязывается при сборке (`engine:bound`), до первой отрисовки, —
 * имена стрелок есть уже в серверной разметке.
 */
export class TCalendarNamesPlugin extends TNamesPlugin<ICalendar> {
	private _engine: TCalendarCollection | null = null

	protected override _name(owner: ICalendar, translations: TTranslations): void {
		const names = translations.calendar

		owner.prevAria.add('aria-label', names.prevMonth)
		owner.nextAria.add('aria-label', names.nextMonth)

		const picker = this._engine?.extensions.picker

		picker?.pickers.forEach(({ level }, index) => {
			const sets = picker.pickerSets(index)
			const months = level === 'months'

			sets.prev.add('aria-label', months ? names.prevYear : names.prevYears)
			sets.next.add('aria-label', months ? names.nextYear : names.nextYears)
		})
	}

	protected override _watch(_owner: ICalendar, name: () => void, ctx: IPluginContext): void {
		ctx.get(TCollectionBundlesPlugin)?.events.on(
			'engine:bound',
			(engine: TCalendarCollection) => {
				this._engine = engine

				name()
				this._listenTo(engine.extensions.picker.events, 'change:pickers', name)
			},
		)
	}

	override destroy(): void {
		this._engine = null

		super.destroy()
	}
}
