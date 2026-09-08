import { TBatchCollectionFacade } from '../batch'
import type { ICollectionComponentOptions, TCollectionFacadeProps } from '../types'
import type { IComponentProps, TComponentEvents } from '../../../component'
import type { IExtension, TBatchExtension, TSelectionExtension, TSelectionMode } from '../../engine'

/** Входные props коллекции с выбором: состав плюс режим. */
export type TSelectionFacadeProps<TItem = any, TItemProps = any> = TCollectionFacadeProps<
	TItem,
	TItemProps
> & {
	mode?: TSelectionMode
}

/**
 * Фасад коллекции с расширением `selection`: режим выбора и выбранное.
 *
 * Подключают Collapse, List (и через него ListBox) и Select. У Tabs выбора
 * нет — там активация, и он наследует только `TBatchCollectionFacade`. Это и
 * есть правило иерархии: фасады повторяют **состав расширений**, а не
 * таксономию компонентов, и сужение дженерика делает нарушение ошибкой
 * компиляции.
 *
 * До этой базы три фасада писали одно и то же по-разному, и это успело стать
 * настоящей ошибкой: у Collapse не было сеттера `mode`, хотя contribution
 * объявляет проп записываемым, — `<Collapse mode="multiple">` молча
 * игнорировался, и вторая раскрытая секция закрывала первую.
 */
export abstract class TSelectionCollectionFacade<
	TItem extends object,
	TExtensions extends {
		batch: TBatchExtension<any>
		selection: TSelectionExtension<any>
	} & Record<string, IExtension<any>>,
	TEvents extends TComponentEvents = TComponentEvents & Record<string, (...args: any[]) => any>,
> extends TBatchCollectionFacade<TItem, TExtensions, TEvents> {
	constructor(
		props: Partial<IComponentProps> = {},
		options: ICollectionComponentOptions<TItem, TExtensions>,
	) {
		super(props, options)

		this.events.relay(this.extensions.selection.events, ['change:selection', 'change:mode'])
	}

	protected override applyProps(props: TSelectionFacadeProps<TItem>): void {
		// `mode` до состава: он решает, сколько элементов можно выбрать
		if (props.mode) this.mode = props.mode

		super.applyProps(props)
	}

	get mode(): TSelectionMode {
		return this.extensions.selection.mode
	}

	set mode(value: TSelectionMode) {
		this.extensions.selection.mode = value
	}

	get selected(): TItem[] {
		return this.extensions.selection.selected
	}

	set selected(value: TItem[]) {
		this.extensions.selection.resetSelection()

		for (const item of value) {
			this.extensions.selection.select(item)
		}
	}
}
