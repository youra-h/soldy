import { TSelectionCollectionFacade } from '../selection'
import type {
	ICollectionComponentOptions,
	TGroupCollectionFacadeEvents,
	TGroupFacadeProps,
} from '../types'
import type { IComponentProps, TDefaultValues } from '../../../component'
import type {
	IExtension,
	IGroupCollectionProps,
	TBatchExtension,
	TGroup,
	TGroupBy,
	TGroupExtension,
	TGroupSection,
	TPlainExtension,
	TSelectionExtension,
} from '../../engine'

/**
 * Фасад коллекции с выбором и расширением `group`: ключ группы элемента,
 * группы с подписями и секции показанного.
 *
 * Подключают Menu, ListBox и Select — у всех троих выбор, поэтому база стоит
 * над `TSelectionCollectionFacade`, а дженерик сужен до `group`: без
 * расширения фасад не подключить (AGENTS.md, «Иерархия фасадов повторяет
 * состав расширений»). Пока потребитель был один (меню), проекция жила в его
 * фасаде; с ListBox и Select она поднялась сюда, иначе три копии разошлись бы,
 * как расходились фасады выбора.
 *
 * Своего у базы нет — проекция расширения: свойства пишутся в него, его
 * события отдаются пробросом (`relayAll`). Что разметка рисует по секциям,
 * решает форма: меню — секции показанного (`sections`), списки, у которых
 * есть рисование, — секции нарисованного (`drawnSections` расширения
 * `draw`).
 */
export abstract class TGroupCollectionFacade<
	TItem extends object,
	TExtensions extends {
		plain: TPlainExtension<any>
		batch: TBatchExtension<any>
		selection: TSelectionExtension<any>
		group: TGroupExtension<any>
	} & Record<string, IExtension<any>>,
	TEvents extends TGroupCollectionFacadeEvents<TItem> = TGroupCollectionFacadeEvents<TItem>,
> extends TSelectionCollectionFacade<TItem, TExtensions, TEvents> {
	/**
	 * Умолчания группировки: снятый из разметки проп связка возвращает к ним.
	 * Не задан `groupBy` — ключ из метки `_.group` данных, не заданы группы —
	 * групп нет.
	 */
	static override defaultValues: typeof TSelectionCollectionFacade.defaultValues &
		TDefaultValues<IGroupCollectionProps, never, 'groupBy' | 'groups'> = {
		...TSelectionCollectionFacade.defaultValues,
		groupBy: undefined,
		groups: undefined,
	}

	constructor(
		props: Partial<IComponentProps> = {},
		options: ICollectionComponentOptions<TItem, TExtensions>,
	) {
		super(props, options)

		this.events.relayAll(this.extensions.group.events)
	}

	/**
	 * Группировку — расширению `group`, до состава: состав, пришедший после,
	 * сразу показан по группам. Не заданные `groupBy` и пустые группы не
	 * применяются: движок снаружи свою группировку не теряет.
	 */
	protected override applyProps(props: TGroupFacadeProps<TItem>): void {
		if (props.groupBy) this.groupBy = props.groupBy
		if (props.groups?.length) this.groups = props.groups

		super.applyProps(props)
	}

	/** Ключ группы элемента. Не задан — метка `_.group` из данных */
	get groupBy(): TGroupBy<TItem> | undefined {
		return this.extensions.group.groupBy
	}

	set groupBy(value: TGroupBy<TItem> | undefined) {
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
	 * Секции показанных элементов по порядку — группы с подписью и элементы без
	 * группы
	 */
	get sections(): ReadonlyArray<TGroupSection<TItem>> {
		return this.extensions.group.sections
	}
}
