import type {
	IInputControl,
	IInputControlProps,
	TInputControlEvents,
	TInputControlStates,
} from '../../base/input-control'
import type { TCollectionStorageDriverEvents } from '../../base/collection'
import type { TAriaAttributes } from '../../../common'
import type { IList, IListProps, TListEvents } from '../list'
import type { ISelectCollectionProps } from './collection/types'
import type { ISelectItem, ISelectItemProps } from './item/types'

/**
 * Значение Select.
 *
 * В режиме `single` — скаляр, в `multiple` — массив: так `v-model` ведёт себя
 * ожидаемо в обоих случаях. Ark хранит массив всегда и это проще внутри, но
 * снаружи вынуждает писать `value[0]` для обычного выпадающего списка.
 *
 * Значение не хранится отдельно от выбора: обе стороны синхронизирует
 * `TSelectExtension`, и источник истины один — коллекция.
 */
export type TSelectValue = string | number | (string | number)[] | undefined

/**
 * Что делает ввод текста в поле `editable`.
 *
 * `none` — ничего, ввод просто отображается. `search` — совпадение по тексту
 * подсвечивается в списке, тем же алгоритмом, что и набор с клавиатуры.
 * `filter` пока ведёт себя как `search`: скрытие несовпавших опций —
 * отдельная задача, здесь только состояние под неё.
 */
export type TSelectEditableMode = 'none' | 'search' | 'filter'

export type TSelectEvents = TInputControlEvents<TSelectValue> &
	TCollectionStorageDriverEvents<ISelectItem> &
	TListEvents & {
		/** change:open */
		'change:open': (value: boolean) => void
		/** open — панель открылась */
		open: () => void
		/** close — панель закрылась */
		close: () => void
		/** change:placeholder */
		'change:placeholder': (value: string) => void
		/** change:closeOnSelect */
		'change:closeOnSelect': (value: boolean) => void
		/** change:clearable */
		'change:clearable': (value: boolean) => void
		/** change:clearLabel */
		'change:clearLabel': (value: string) => void
		/** change:editable */
		'change:editable': (value: boolean) => void
		/** change:editableMode */
		'change:editableMode': (value: TSelectEditableMode) => void
		/** change:inputValue */
		'change:inputValue': (value: string) => void
	}

/**
 * Собственные props Select — без коллекционной части.
 *
 * Списочные свойства приходят из `IListProps` — общего контракта с ListBox.
 * Общий там только контракт: предок у каждого свой.
 */
export interface ISelectComponentProps extends IInputControlProps<TSelectValue>, IListProps {
	/** Открыта ли панель со списком */
	open?: boolean
	/** Текст поля, пока ничего не выбрано */
	placeholder?: string
	/** Закрывать ли панель после выбора */
	closeOnSelect?: boolean
	/** Показывать ли кнопку очистки значения */
	clearable?: boolean
	/** Слово для кнопки очистки; к нему добавляется имя поля */
	clearLabel?: string
	/**
	 * Можно ли вводить текст в поле. `false` — select-only (по умолчанию).
	 * Ставит `readonly`: `editable: true` снимает его, `false` — включает.
	 */
	editable?: boolean
	/**
	 * Что делает ввод текста при `editable: true`. Без него не действует.
	 * По умолчанию `none`.
	 */
	editableMode?: TSelectEditableMode
	/**
	 * То, что показывает поле. В select-only всегда равно `text` выбранного;
	 * в `editable` расходится с ним, пока пользователь печатает.
	 */
	inputValue?: string
}

/** Полный набор props: собственные + коллекционные. */
export interface ISelectProps
	extends ISelectComponentProps, ISelectCollectionProps<ISelectItemProps, ISelectItem> {}

export type TSelectStates = TInputControlStates<TSelectValue>

export interface ISelect<
	TProps extends ISelectProps = ISelectProps,
	TEvents extends TSelectEvents = TSelectEvents,
	// Параметр держит арность дженерика, единую с базовым контролом.
	// eslint-disable-next-line @typescript-eslint/no-unused-vars
	TStates extends TSelectStates = TSelectStates,
>
	extends IInputControl<TSelectValue, TProps, TEvents>, IList {
	/** Открыта ли панель со списком */
	open: boolean
	/** Текст поля, пока ничего не выбрано */
	placeholder: string
	/** Закрывать ли панель после выбора */
	closeOnSelect: boolean
	/** Показывать ли кнопку очистки значения */
	clearable: boolean
	/** Слово для кнопки очистки */
	clearLabel: string
	/** Можно ли вводить текст в поле. `false` — select-only (по умолчанию) */
	editable: boolean
	/** Что делает ввод текста при `editable: true`. Без него не действует */
	editableMode: TSelectEditableMode
	/** То, что показывает поле — набранное или текст выбранного */
	inputValue: string
	/** Имя кнопки очистки целиком: `clearLabel` + имя поля */
	readonly clearAria: TAriaAttributes
	/** Подгонять ли ширину панели под поле. Производное от `contentFit` */
	readonly autoFitWidth: boolean
	/** Переключить панель. Ничего не делает, если открывать нельзя. */
	toggleOpen(): void
	/** Можно ли сейчас открыть панель */
	readonly openable: boolean
}
