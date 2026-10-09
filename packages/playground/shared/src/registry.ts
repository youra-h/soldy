import {
	AccordionDescriptor,
	AccordionCollectionDescriptor,
	ButtonDescriptor,
	CalendarDescriptor,
	CalendarCollectionDescriptor,
	CheckBoxDescriptor,
	ComponentViewDescriptor,
	ControlDescriptor,
	DateInputDescriptor,
	DatePickerDescriptor,
	DialogDescriptor,
	DragAndDropDescriptor,
	DrawerDescriptor,
	FrameDescriptor,
	IconDescriptor,
	InputDescriptor,
	InputControlDescriptor,
	InteractiveDescriptor,
	LabelDescriptor,
	ListBoxDescriptor,
	ListBoxCollectionDescriptor,
	PopoverDescriptor,
	ProgressLinearDescriptor,
	ProgressSpinnerDescriptor,
	RadioGroupDescriptor,
	RadioGroupCollectionDescriptor,
	ScrollerDescriptor,
	SelectDescriptor,
	SelectCollectionDescriptor,
	SkeletonDescriptor,
	SliderDescriptor,
	StylableDescriptor,
	SwitchDescriptor,
	TableDescriptor,
	TableCollectionDescriptor,
	TabsDescriptor,
	TabsCollectionDescriptor,
	TagsDescriptor,
	TagsCollectionDescriptor,
	TextableDescriptor,
	TooltipDescriptor,
	ValueControlDescriptor,
	VirtualDescriptor,
} from '@soldy-ui/setup'
import { arEG, enUS, esES, extendLocale, frFR, ruRU, zhCN } from '@soldy-ui/plugins'
import type { TLocale, TMotionMode } from '@soldy-ui/plugins'
import type { TComponentEntry, TThemeEntry, TIconPackEntry } from './types'

/**
 * Реестр компонентов стенда.
 *
 * Пишется руками, потому что в библиотеке его нет: дескрипторы разложены по
 * ручным barrel-файлам, а поля `name` у дескриптора не существует — опознать
 * компонент в рантайме можно только по `ctor.name` или `ctor.baseClass`.
 * Порядок здесь же задаёт порядок пунктов меню.
 *
 * `showcase: false` — слои наследования. Страницу они имеют (по ним удобно
 * смотреть, какие пропы откуда приходят), но на витрине им делать нечего:
 * это не компоненты, а уровни контракта.
 */
export const COMPONENTS: readonly TComponentEntry[] = [
	{
		id: 'button',
		label: 'Button',
		descriptor: ButtonDescriptor,
		showcase: true,
		span: 1,
		description: 'Кнопка: текст, иконки в слотах, четыре вида оформления',
	},
	{
		id: 'input',
		label: 'Input',
		descriptor: InputDescriptor,
		showcase: true,
		span: 1,
		description: 'Текстовое поле со слотами под иконки и кнопки',
	},
	{
		id: 'check-box',
		label: 'CheckBox',
		descriptor: CheckBoxDescriptor,
		showcase: true,
		span: 1,
		description: 'Флажок с третьим, неопределённым состоянием',
	},
	{
		id: 'switch',
		label: 'Switch',
		descriptor: SwitchDescriptor,
		showcase: true,
		span: 1,
		description: 'Переключатель — то же значение, другая метафора',
	},
	{
		id: 'label',
		label: 'Label',
		descriptor: LabelDescriptor,
		showcase: true,
		span: 1,
		description: 'Подпись контрола: клик по тексту переключает его, текст — его имя',
	},
	{
		id: 'slider',
		label: 'Slider',
		descriptor: SliderDescriptor,
		showcase: true,
		span: 1,
		description: 'Ползунок: число или диапазон перетаскиванием, клавишами и жестом скринридера',
	},
	{
		id: 'radio-group',
		label: 'RadioGroup',
		descriptor: RadioGroupDescriptor,
		collectionDescriptor: RadioGroupCollectionDescriptor,
		showcase: true,
		span: 1,
		description: 'Выбор одного из нескольких: нативные радио с общим name',
	},
	{
		id: 'select',
		label: 'Select',
		descriptor: SelectDescriptor,
		collectionDescriptor: SelectCollectionDescriptor,
		showcase: true,
		span: 2,
		description: 'Поле выбора: input плюс список в оверлее, паттерн Combobox',
	},
	{
		id: 'calendar',
		label: 'Calendar',
		descriptor: CalendarDescriptor,
		collectionDescriptor: CalendarCollectionDescriptor,
		showcase: true,
		span: 1,
		description: 'Сетки месяцев: выбор одной даты, нескольких или диапазона',
	},
	{
		id: 'date-input',
		label: 'DateInput',
		descriptor: DateInputDescriptor,
		showcase: true,
		span: 1,
		description:
			'Поле даты и времени по частям в формате локали: значение выделяется и копируется целиком',
	},
	{
		id: 'date-picker',
		label: 'DatePicker',
		descriptor: DatePickerDescriptor,
		showcase: true,
		span: 1,
		description: 'Поле даты и календарь в панели: одна дата или диапазон',
	},
	{
		id: 'popover',
		label: 'Popover',
		descriptor: PopoverDescriptor,
		showcase: true,
		span: 1,
		description: 'Панель у триггера с произвольным содержимым: немодальный диалог',
	},
	{
		id: 'tooltip',
		label: 'Tooltip',
		descriptor: TooltipDescriptor,
		showcase: true,
		span: 1,
		description: 'Подсказка у элемента: при наведении и при фокусе с клавиатуры',
	},
	{
		id: 'dialog',
		label: 'Dialog',
		descriptor: DialogDescriptor,
		showcase: true,
		span: 1,
		description: 'Модальное окно: по центру или у края экрана, с разворотом на весь экран',
	},
	{
		id: 'drawer',
		label: 'Drawer',
		descriptor: DrawerDescriptor,
		showcase: true,
		span: 1,
		description: 'Выезжающая панель у края экрана или контейнера: смахивается жестом',
	},
	{
		id: 'scroller',
		label: 'Scroller',
		descriptor: ScrollerDescriptor,
		showcase: true,
		span: 2,
		description: 'Лента произвольного содержимого в одну строку: листают две кнопки',
	},
	{
		id: 'list-box',
		label: 'ListBox',
		descriptor: ListBoxDescriptor,
		collectionDescriptor: ListBoxCollectionDescriptor,
		showcase: true,
		span: 1,
		description: 'Список с выбором одного или нескольких элементов',
	},
	{
		id: 'table',
		label: 'Table',
		descriptor: TableDescriptor,
		collectionDescriptor: TableCollectionDescriptor,
		showcase: true,
		span: 2,
		description: 'Таблица: колонки данными, сортировка по заголовкам, выбор строк чекбоксами',
	},
	{
		id: 'tabs',
		label: 'Tabs',
		descriptor: TabsDescriptor,
		collectionDescriptor: TabsCollectionDescriptor,
		showcase: true,
		span: 2,
		description: 'Вкладки: список табов и панели, связанные по значению',
	},
	{
		id: 'tags',
		label: 'Tags',
		descriptor: TagsDescriptor,
		collectionDescriptor: TagsCollectionDescriptor,
		showcase: true,
		span: 1,
		description: 'Набор тегов: закрытие по кнопке, необязательный выбор',
	},
	{
		id: 'accordion',
		label: 'Accordion',
		descriptor: AccordionDescriptor,
		collectionDescriptor: AccordionCollectionDescriptor,
		showcase: true,
		span: 2,
		description: 'Секции, раскрывающиеся по одной или сразу нескольким',
	},
	{
		id: 'icon',
		label: 'Icon',
		descriptor: IconDescriptor,
		showcase: true,
		span: 1,
		description: 'Иконка из подключённого пакета, по роли',
	},
	{
		id: 'progress-linear',
		label: 'ProgressLinear',
		descriptor: ProgressLinearDescriptor,
		showcase: true,
		span: 1,
		description: 'Индикатор выполнения линией: доля готового, а пока она неизвестна — бег',
	},
	{
		id: 'progress-spinner',
		label: 'ProgressSpinner',
		descriptor: ProgressSpinnerDescriptor,
		showcase: true,
		span: 1,
		description: 'Индикатор выполнения кольцом: доля готового, а пока она неизвестна — бег',
	},
	{
		id: 'skeleton',
		label: 'Skeleton',
		descriptor: SkeletonDescriptor,
		showcase: true,
		span: 1,
		description: 'Заглушка на время загрузки',
	},
	{
		id: 'drag-and-drop',
		label: 'DragAndDrop',
		descriptor: DragAndDropDescriptor,
		showcase: true,
		span: 2,
		description: 'Перетаскивание элементов коллекции',
	},
	{
		id: 'virtual',
		label: 'Virtual',
		descriptor: VirtualDescriptor,
		showcase: true,
		span: 2,
		description: 'Окно для длинных списков: ListBox и Table внутри рисуют только видимое',
	},
	{
		id: 'frame',
		label: 'Frame',
		descriptor: FrameDescriptor,
		showcase: false,
		span: 1,
		description: 'Слой оверлея: позиционирование, якорь, закрытие по нажатию мимо',
	},
	{
		id: 'component-view',
		label: 'ComponentView',
		descriptor: ComponentViewDescriptor,
		showcase: false,
		span: 1,
		description: 'Визуальный слой: rendered, visible, tag, classes, aria, dataset',
	},
	{
		id: 'control',
		label: 'Control',
		descriptor: ControlDescriptor,
		showcase: false,
		span: 1,
		description: 'Интерактивный слой: disabled, фокус, активация',
	},
	{
		id: 'stylable',
		label: 'Stylable',
		descriptor: StylableDescriptor,
		showcase: false,
		span: 1,
		description: 'Слой оформления: size и variant',
	},
	{
		id: 'textable',
		label: 'Textable',
		descriptor: TextableDescriptor,
		showcase: false,
		span: 1,
		description: 'Слой текста',
	},
	{
		id: 'interactive',
		label: 'Interactive',
		descriptor: InteractiveDescriptor,
		showcase: false,
		span: 1,
		description: 'Слой взаимодействия без оформления',
	},
	{
		id: 'value-control',
		label: 'ValueControl',
		descriptor: ValueControlDescriptor,
		showcase: false,
		span: 1,
		description: 'Слой значения: value и name',
	},
	{
		id: 'input-control',
		label: 'InputControl',
		descriptor: InputControlDescriptor,
		showcase: false,
		span: 1,
		description: 'Слой поля формы: readonly, required, id',
	},
]

export const SHOWCASE = COMPONENTS.filter((entry) => entry.showcase)

export function findComponent(id: string): TComponentEntry | undefined {
	return COMPONENTS.find((entry) => entry.id === id)
}

/**
 * Темы. Тёмная схема — не отдельная тема, а атрибут `${value}-dark`, поэтому
 * в списке её нет: она включается свитчем.
 */
export const THEMES: readonly TThemeEntry[] = [{ id: 'oren', label: 'Oren', value: 'oren' }]

/** Пакеты иконок. Реализуют контракт `ICON_ROLES`. */
export const ICON_PACKS: readonly TIconPackEntry[] = [{ id: 'material', label: 'Material' }]

/**
 * Режимы движения библиотеки (`useMotion`) с подписями — в порядке списка в
 * шапке. Ключ — режим, поэтому запись покрывает `TMotionMode` целиком: новый
 * режим библиотеки стенд попросит у себя на компиляции.
 */
export const MOTION_MODES: Readonly<Record<TMotionMode, string>> = {
	system: 'Как в системе',
	full: 'Всегда',
	reduce: 'Без движения',
}

/** Язык в списке шапки: подпись и локаль библиотеки. */
export type TLocaleEntry = {
	readonly label: string
	readonly locale: TLocale
}

/**
 * Языки библиотеки на стенде — по тегу BCP 47, в порядке списка в шапке:
 * локаль уходит провайдеру (`LocaleProvider` вокруг стенда). Своего языка у
 * компонента нет, поэтому посмотреть строки, подписи дат, неделю и формат
 * поля на другом языке можно только отсюда.
 *
 * Сначала — готовые локали библиотеки (языки ООН). Дальше — языки без готовых
 * строк, собранные поверх английской (`extendLocale`): строки английские, а
 * Intl — свой. Подборка — по тому, что язык меняет: справа налево (`he-IL`,
 * `ar-EG` — ещё и арабские цифры), буддийский год (`th-TH`), числа слитно с
 * подписью (`ja-JP`).
 */
export const LOCALES: Readonly<Record<string, TLocaleEntry>> = {
	'en-US': { label: 'English', locale: enUS },
	'ru-RU': { label: 'Русский', locale: ruRU },
	'zh-CN': { label: '中文', locale: zhCN },
	'fr-FR': { label: 'Français', locale: frFR },
	'es-ES': { label: 'Español', locale: esES },
	'ar-EG': { label: 'العربية', locale: arEG },
	'de-DE': { label: 'Deutsch', locale: extendLocale(enUS, { tag: 'de-DE' }) },
	'he-IL': { label: 'עברית', locale: extendLocale(enUS, { tag: 'he-IL' }) },
	'th-TH': { label: 'ไทย', locale: extendLocale(enUS, { tag: 'th-TH' }) },
	'ja-JP': { label: '日本語', locale: extendLocale(enUS, { tag: 'ja-JP' }) },
}
