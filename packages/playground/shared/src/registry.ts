import {
	AccordionDescriptor,
	AccordionCollectionDescriptor,
	ButtonDescriptor,
	CheckBoxDescriptor,
	ComponentViewDescriptor,
	ControlDescriptor,
	DragAndDropDescriptor,
	FrameDescriptor,
	IconDescriptor,
	InputDescriptor,
	InputControlDescriptor,
	InteractiveDescriptor,
	ListBoxDescriptor,
	ListBoxCollectionDescriptor,
	SelectDescriptor,
	SelectCollectionDescriptor,
	SkeletonDescriptor,
	SpinnerDescriptor,
	StylableDescriptor,
	SwitchDescriptor,
	TabsDescriptor,
	TabsCollectionDescriptor,
	TextableDescriptor,
	ValueControlDescriptor,
} from '@soldy/setup'
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
		id: 'select',
		label: 'Select',
		descriptor: SelectDescriptor,
		collectionDescriptor: SelectCollectionDescriptor,
		showcase: true,
		span: 2,
		description: 'Поле выбора: input плюс список в оверлее, паттерн Combobox',
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
		id: 'tabs',
		label: 'Tabs',
		descriptor: TabsDescriptor,
		collectionDescriptor: TabsCollectionDescriptor,
		showcase: true,
		span: 2,
		description: 'Вкладки: список табов и панели, связанные по значению',
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
		id: 'spinner',
		label: 'Spinner',
		descriptor: SpinnerDescriptor,
		showcase: true,
		span: 1,
		description: 'Индикатор ожидания',
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
