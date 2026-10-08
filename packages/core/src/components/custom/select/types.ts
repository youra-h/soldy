import type {
	IInputControl,
	IInputControlProps,
	TInputControlEvents,
} from '../../base/input-control'
import type { TCollectionStorageDriverEvents } from '../../base/collection'
import type { ISwipeable, TSwipe, TSwipeableEvents } from '../../base/layer'
import type { TAria, TAriaAttributes, TDatasetAttributes } from '../../../common'
import type { IList, IListProps, TListEvents } from '../list'
import type { IInput } from '../input'
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
 * `none` — встроенный поиск выключен, набранный текст никак не влияет на
 * список. Нужен, когда фильтрацией и открытием панели управляет само
 * приложение (например, серверный поиск: слушает значение поля, подменяет
 * опции и открывает панель само) — встроенный поиск в этом случае лишний,
 * он подсвечивал бы и скрывал опции по уже устаревшему списку.
 * `search` — совпадение по тексту подсвечивается в списке, тем же
 * алгоритмом, что и набор с клавиатуры.
 * `filter` пока ведёт себя как `search`: скрытие несовпавших опций —
 * отдельная задача, здесь только состояние под неё.
 */
export type TSelectEditableMode = 'none' | 'search' | 'filter'

/**
 * С какой стороны поля открывается панель со списком.
 *
 * `auto` — снизу, а если снизу панель не помещается в окно и сверху места
 * больше, то сверху. `bottom` и `top` — сторона, на которой настаивает
 * потребитель: она держится, даже если панель там не помещается.
 *
 * Сторону считает `TAnchorPlugin` вложенного Frame; Select только переводит
 * выбор в его пропы (`panelPlacement`, `panelFlip`).
 */
export type TSelectPlacement = 'auto' | 'top' | 'bottom'

/**
 * Сторона панели в терминах плагина якоря — то, что Select отдаёт в
 * `anchor_placement` вложенного Frame. Выравнивание всегда по началу поля.
 */
export type TSelectPanelPlacement = 'bottom-start' | 'top-start'

export type TSelectEvents = TInputControlEvents<TSelectValue> &
	TCollectionStorageDriverEvents<ISelectItem> &
	TListEvents &
	TSwipeableEvents & {
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
		/** change:editable */
		'change:editable': (value: boolean) => void
		/** change:editableMode */
		'change:editableMode': (value: TSelectEditableMode) => void
		/** change:removeOnBackspace */
		'change:removeOnBackspace': (value: boolean) => void
		/** change:placement */
		'change:placement': (value: TSelectPlacement) => void
		/** change:listAria — набор атрибутов списка изменился */
		'change:listAria': (value: TAriaAttributes) => void
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
	/** Показывать ли кнопку очистки значения. Рисует её поле, значение уходит ему */
	clearable?: boolean
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
	 * Удалять ли выбранные теги по `Backspace` в пустом поле. Действует
	 * только вместе с `editable: true` и множественным выбором; по умолчанию
	 * выключено. Первое нажатие в пустом поле лишь взводит механизм, второе и
	 * каждое следующее подряд удаляет последний тег.
	 */
	removeOnBackspace?: boolean
	/**
	 * С какой стороны поля открывается панель. По умолчанию `auto`: снизу, а у
	 * нижнего края окна сверху. `top` и `bottom` держат сторону всегда.
	 */
	placement?: TSelectPlacement
	/**
	 * За что панель можно смахнуть, чтобы закрыть: ни за что (по умолчанию), за
	 * полосу или за любое место, кроме опций и прокручиваемого списка. Панель
	 * уходит от поля: под ним — вниз, над ним — вверх
	 */
	swipe?: TSwipe
}

/** Полный набор props: собственные + коллекционные. */
export interface ISelectProps
	extends ISelectComponentProps, ISelectCollectionProps<ISelectItemProps, ISelectItem> {}

/**
 * Select. Панель смахивают, чтобы закрыть (`ISwipeable`): она у поля, и
 * сторону после flip знает только её узел — `swipeSide` всегда `null`.
 */
export interface ISelect<
	TProps extends ISelectProps = ISelectProps,
	TEvents extends TSelectEvents = TSelectEvents,
>
	extends IInputControl<TSelectValue, TProps, TEvents>, IList, ISwipeable {
	/** Открыта ли панель со списком */
	open: boolean
	/** Текст поля, пока ничего не выбрано */
	placeholder: string
	/** Закрывать ли панель после выбора */
	closeOnSelect: boolean
	/** Показывать ли кнопку очистки значения. Рисует её поле, имя кнопки — тоже (`field.clearAria`) */
	clearable: boolean
	/** Можно ли вводить текст в поле. `false` — select-only (по умолчанию) */
	editable: boolean
	/** Что делает ввод текста при `editable: true`. Без него не действует */
	editableMode: TSelectEditableMode
	/**
	 * Удалять ли выбранные теги по `Backspace` в пустом поле. Действует
	 * только вместе с `editable` и множественным выбором; по умолчанию `false`.
	 */
	removeOnBackspace: boolean
	/** С какой стороны поля открывается панель. По умолчанию `auto` */
	placement: TSelectPlacement
	/** Сторона панели для плагина якоря. Производное от `placement` */
	readonly panelPlacement: TSelectPanelPlacement
	/** Разрешён ли плагину якоря flip. Производное от `placement` */
	readonly panelFlip: boolean
	/**
	 * ARIA списка в панели: `role="listbox"` — Select, `aria-multiselectable` —
	 * коллекция, `id` — плагин связок
	 */
	readonly listAria: TAria
	/** Подгонять ли ширину панели под поле. Производное от `contentFit` */
	readonly autoFitWidth: boolean
	/**
	 * `data-*` панели для темы: тянут ли её (`data-swiping`). Открытость
	 * панели (`data-open`) пишет её слой
	 */
	readonly panelDataset: TDatasetAttributes
	/** Рисовать ли полосу, за которую панель тянут: жест включён */
	readonly handleRendered: boolean
	/** Переключить панель. Ничего не делает, если открывать нельзя. */
	toggleOpen(): void
	/** Можно ли сейчас открыть панель */
	readonly openable: boolean
	/**
	 * Поле ввода — экземпляр `TInput`, единственный владелец текста и
	 * плейсхолдера, которые видит пользователь. Не меняется за время жизни
	 * Select, событий `change:` у геттера нет.
	 */
	readonly field: IInput
}
