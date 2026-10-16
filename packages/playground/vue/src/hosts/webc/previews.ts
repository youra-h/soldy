import { COLLECTION_ITEMS } from '@soldy-ui/playground-shared'

/**
 * Как рисовать компонент на стенде — в Web Components.
 *
 * Та же карта, что у хоста Vue (`hosts/vue/previews.ts`), и с теми же ключами
 * — идентификаторами реестра. Разметки у платформы нет: элемент строит код
 * хоста (`document.createElement(tag, { is })`), поэтому превью — не функция
 * с разметкой, а описание элемента: нативный тег, имя элемента soldy, пропсы
 * превью, свои атрибуты элемента, дети по слотам и обёртка. Пропсы строки
 * ложатся поверх пропсов превью — как атрибуты перед `{...bind}` в превью
 * React, — и превью то же самое, что у Vue и React, чтобы колонки фреймворков
 * можно было сравнивать глазами.
 *
 * Чего у адаптера нет, того нет и в карте: компоненты переносятся своими
 * задачами.
 */
export type TPreview = {
	/** Нативный тег элемента: элемент soldy — встроенный элемент своего тега. */
	readonly tag: string
	/** Имя элемента soldy — значение `is`. */
	readonly is: string
	/** Пропсы превью — под пропсами строки. */
	readonly props?: Readonly<Record<string, unknown>>
	/**
	 * Свои атрибуты элемента — не пропы ядра, а то, что элемент читает сам: роль
	 * иконки (`icon`). Имя — как у свойства элемента, атрибут — то же имя через
	 * дефис, как у пропов. Это часть того, что элемент рисует: код колонок пишет
	 * их всегда, без роли иконка пуста.
	 */
	readonly attributes?: Readonly<Record<string, string>>
	/**
	 * Дети по слотам — свет элемента: имя слота → элементы soldy и разметка без
	 * компонента. Код хоста ставит их в элемент до вставки, элементы — с
	 * атрибутом `slot`, кроме слота по умолчанию.
	 */
	readonly slots?: Readonly<Record<string, readonly TContent[]>>
	/**
	 * Обёртка — элемент со своими пропсами, в слоте по умолчанию которого лежит
	 * компонент: CheckBox и Switch — в подписи Label, как у Vue и React. Пропсы
	 * строки, `ctrl` и слушатели — у компонента, обёртке пропсы задаёт
	 * описание. Код колонок обёртку не показывает: он про компонент.
	 */
	readonly wrapper?: TPreview
}

/**
 * Ребёнок в слоте: элемент soldy со своим описанием — часть коллекции, контрол
 * подписи — или разметка без компонента — текст, блок с отступом. Разметку
 * строит функция: у каждой отрисовки свои узлы.
 */
export type TContent = TPreview | (() => Node)

/** Текст в слоте — подпись радио. */
const text = (value: string) => (): Node => document.createTextNode(value)

/** Блок содержимого с отступом — панель таба, содержимое секции, как у соседей. */
const block = (padding: string, value: string) => (): Node => {
	const node = document.createElement('div')

	node.style.padding = padding
	node.textContent = value

	return node
}

/** Содержимое коллекций — из общего манифеста, как у Vue и React. */
const ITEMS = COLLECTION_ITEMS

export const PREVIEWS: Record<string, TPreview> = {
	// Подпись — пропом `text`, а не содержимым: заданный слот перекрывает проп, и
	// строка `text` на странице свойств не меняла бы ничего видимого
	button: { tag: 'button', is: 'so-button', props: { text: 'Кнопка' } },

	input: { tag: 'div', is: 'so-input', props: { placeholder: 'Введите текст' } },

	// Текста у флажка и переключателя нет, оба — голый контрол: подпись даёт
	// обёртка Label. Её пропы задаёт превью, строки страницы правят контрол
	'check-box': {
		tag: 'span',
		is: 'so-check-box',
		wrapper: { tag: 'label', is: 'so-label', props: { text: 'Согласен' } },
	},

	switch: {
		tag: 'span',
		is: 'so-switch',
		wrapper: { tag: 'label', is: 'so-label', props: { text: 'Включено' } },
	},

	// Подпись — пропом `text`, контрол — слотом. Строки страницы правят саму
	// подпись: сторону, размер текста, вариант
	label: {
		tag: 'label',
		is: 'so-label',
		props: { text: 'Согласен' },
		slots: { default: [{ tag: 'span', is: 'so-check-box' }] },
	},

	// Подпись — содержимым: текста у радио нет, оно голый контрол, как CheckBox.
	// Корень радио — подпись, `<label is="so-radio-group-item">`
	'radio-group': {
		tag: 'div',
		is: 'so-radio-group',
		slots: {
			default: ITEMS.map((item) => ({
				tag: 'label',
				is: 'so-radio-group-item',
				props: { value: item.value },
				slots: { default: [text(item.text)] },
			})),
		},
	},

	// Первый таб активен сразу — иначе ни одна панель не покажется. Панели —
	// слотом `content`, вне списка табов
	tabs: {
		tag: 'div',
		is: 'so-tabs',
		slots: {
			default: ITEMS.map((item, index) => ({
				tag: 'div',
				is: 'so-tabs-item',
				props: { active: index === 0, ...item },
			})),
			content: ITEMS.map((item) => ({
				tag: 'div',
				is: 'so-tabs-content',
				props: { value: item.value },
				slots: { default: [block('12px', `Панель «${item.text}»`)] },
			})),
		},
	},

	accordion: {
		tag: 'div',
		is: 'so-accordion',
		slots: {
			default: ITEMS.map((item) => ({
				tag: 'div',
				is: 'so-accordion-item',
				props: { ...item },
				slots: { default: [block('4px 0', `Содержимое «${item.text}»`)] },
			})),
		},
	},

	// Глиф — роль, свой атрибут элемента: `<svg>` рисунка строит шаблон Icon
	icon: { tag: 'span', is: 'so-icon', attributes: { icon: 'arrowDown' } },

	// Кольцо строчное и своего размера. По умолчанию оно пусто — доля ноль, а
	// бег — флаг `indeterminate`. Имени без видимой подписи у него нет, превью
	// даёт его пропом
	'progress-spinner': {
		tag: 'span',
		is: 'so-progress-spinner',
		props: { aria_label: 'Загрузка' },
	},

	skeleton: { tag: 'div', is: 'so-skeleton', props: { width: 160, height: 16 } },
}
