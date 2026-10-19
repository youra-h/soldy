import { TSelectionCollectionFacade } from '../../../../base/collection'
import type {
	TCollectionEngine,
	TCollectionFacadeOptions,
	TGroup,
	TGroupBy,
	TGroupSection,
} from '../../../../base/collection'
import type { TDefaultValues } from '../../../../base/component'
import { menuExtensions } from '../factory'
import { completeEngine } from '../../../../base/collection/create/internal'
import type {
	IMenuCollectionProps,
	TMenuCollectionExtensions,
	TMenuCollectionFacadeEngine,
	TMenuCollectionFacadeEvents,
	TMenuCollectionFacadeProps,
} from '../types'
import type { IMenuItem } from '../../item/types'
import type { IMenu } from '../../types'

/**
 * Фасад коллекции меню.
 *
 * Состав и выбор приходят из базы (`TSelectionCollectionFacade`), своё —
 * проброс расширений: `menu` — событие `choose`, нажатие пункта-действия;
 * `group` — группы пунктов и секции показанного, по которым меню рисует
 * пункты с подписями групп и разделителями.
 *
 * Выбор у меню — отметки флажков, и режим у него всегда `multiple`: флажки
 * отмечаются независимо. Свой движок получает режим от `menuExtensions`, а
 * пришедший снаружи со своим выбором (`createEngineSelection`, у которого
 * `single`) фасад переводит в него сам — иначе второй флажок снимал бы
 * отметку с первого.
 */
export class TMenuCollectionFacade extends TSelectionCollectionFacade<
	IMenuItem,
	TMenuCollectionExtensions,
	TMenuCollectionFacadeEvents
> {
	/**
	 * Умолчания группировки: снятый из разметки проп связка возвращает к ним.
	 * Не задан `groupBy` — ключ из метки `_.group` данных, не заданы группы —
	 * групп нет.
	 */
	static override defaultValues: typeof TSelectionCollectionFacade.defaultValues &
		TDefaultValues<IMenuCollectionProps, never, 'groupBy' | 'groups'> = {
		...TSelectionCollectionFacade.defaultValues,
		groupBy: undefined,
		groups: undefined,
	}

	constructor(
		props: TMenuCollectionFacadeProps = {},
		options: TCollectionFacadeOptions<TMenuCollectionFacadeEngine, IMenu> = {},
	) {
		// Движок мог прийти снаружи собранным на любом уровне — `completeEngine`
		// доставит в него то, чего не хватает меню. Именно здесь, а не в теле:
		// базы трогают расширения в своих конструкторах
		super(
			{},
			{
				engine: completeEngine(options.engine, menuExtensions()) as TCollectionEngine<
					IMenuItem,
					TMenuCollectionExtensions
				>,
				owner: options.owner,
			},
		)

		if (!options.engine) this.bindOwner()

		this.extensions.selection.mode = 'multiple'

		this.events.relayAll(this.extensions.group.events)
		this.events.relayAll(this.extensions.menu.events)

		this.applyProps(props)
	}

	/**
	 * Группировку — расширению `group`, до состава: состав, пришедший после,
	 * сразу показан по группам. Не заданные `groupBy` и пустые группы не
	 * применяются: движок снаружи свою группировку не теряет.
	 */
	protected override applyProps(props: TMenuCollectionFacadeProps): void {
		if (props.groupBy) this.groupBy = props.groupBy
		if (props.groups?.length) this.groups = props.groups

		super.applyProps(props)
	}

	/** Ключ группы пункта. Не задан — метка `_.group` из данных */
	get groupBy(): TGroupBy<IMenuItem> | undefined {
		return this.extensions.group.groupBy
	}

	set groupBy(value: TGroupBy<IMenuItem> | undefined) {
		this.extensions.group.groupBy = value
	}

	/** Группы по порядку, с подписями */
	get groups(): TGroup[] {
		return this.extensions.group.groups
	}

	/** Не заданы — групп нет. Сверка по содержимому */
	set groups(value: readonly TGroup[] | undefined) {
		this.extensions.group.groups = value
	}

	/**
	 * Секции показанных пунктов по порядку — группы с подписью и пункты без
	 * группы. Отсюда рисует разметка: между соседними секциями — разделитель
	 */
	get sections(): ReadonlyArray<TGroupSection<IMenuItem>> {
		return this.extensions.group.sections
	}
}
