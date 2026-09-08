import { h, type Component } from 'vue'
import {
	Accordion,
	Button,
	CheckBox,
	ComponentView,
	DragAndDrop,
	Icon,
	Input,
	ListBox,
	Select,
	Skeleton,
	Spinner,
	Switch,
	Tabs,
} from '@soldy/ui-vue'

/**
 * Как рисовать компонент на стенде.
 *
 * Страница компонента универсальна — она строится из дескриптора и о самих
 * компонентах ничего не знает. Но нарисовать `Tabs` без вкладок нельзя, а
 * `Button` без текста бессмысленно: **содержимое — не свойство, его из
 * метаданных не достать**. Эта карта и есть недостающая часть, и она
 * фреймворкозависима, поэтому лежит в адаптере, а не в общем пакете.
 *
 * Функция получает готовые атрибуты (`bind`) и рисует ими компонент. Одна и та
 * же функция обслуживает обе колонки: в первой в `bind` лежат пропы, во второй
 * — только `ctrl` с экземпляром ядра.
 */
export type TPreview = (bind: Record<string, unknown>) => unknown

const ITEMS = [
	{ value: 'a', text: 'Первый' },
	{ value: 'b', text: 'Второй' },
	{ value: 'c', text: 'Третий' },
]

/** Слои наследования: у них нет своей разметки, показываем пустую коробку. */
const layer =
	(label: string): TPreview =>
	(bind) =>
		h(ComponentView, bind, { default: () => label })

export const PREVIEWS: Record<string, TPreview> = {
	button: (bind) => h(Button, bind, { default: () => 'Кнопка' }),

	input: (bind) => h(Input, { placeholder: 'Введите текст', ...bind }),

	'check-box': (bind) => h(CheckBox, bind, { default: () => 'Согласен' }),

	switch: (bind) => h(Switch, bind, { default: () => 'Включено' }),

	select: (bind) =>
		h(Select as Component, { placeholder: 'Выберите', ...bind }, () =>
			ITEMS.map((item) => h(Select.Item, { key: item.value, ...item })),
		),

	'list-box': (bind) =>
		h(ListBox as Component, bind, () =>
			ITEMS.map((item) => h(ListBox.Item, { key: item.value, ...item })),
		),

	tabs: (bind) =>
		h(Tabs as Component, bind, () => [
			...ITEMS.map((item) => h(Tabs.Item, { key: item.value, ...item })),
			...ITEMS.map((item) =>
				h(Tabs.Content, { key: `c-${item.value}`, value: item.value }, () =>
					h('div', { style: 'padding:12px' }, `Панель «${item.text}»`),
				),
			),
		]),

	accordion: (bind) =>
		h(Accordion as Component, bind, () =>
			ITEMS.map((item) =>
				h(Accordion.Item, { key: item.value, ...item }, () =>
					h('div', { style: 'padding:4px 0' }, `Содержимое «${item.text}»`),
				),
			),
		),

	icon: (bind) => h(Icon, { tag: 'arrowDown', ...bind }),

	spinner: (bind) => h(Spinner, bind),

	skeleton: (bind) => h(Skeleton, { width: 160, height: 16, ...bind }),

	'drag-and-drop': (bind) =>
		h(DragAndDrop as Component, bind, () =>
			ITEMS.map((item) =>
				h('div', { key: item.value, style: 'padding:6px 10px' }, item.text),
			),
		),

	frame: (bind) =>
		h(ComponentView, bind, { default: () => 'Frame показывается на своей странице' }),

	'component-view': layer('ComponentView'),
	control: layer('Control'),
	stylable: layer('Stylable'),
	textable: layer('Textable'),
	interactive: layer('Interactive'),
	'value-control': layer('ValueControl'),
	'input-control': layer('InputControl'),
}

/**
 * Те же превью, но как компоненты — их принимает `<component :is>`.
 *
 * Обёртки строятся один раз при загрузке модуля, а не на каждый рендер: новая
 * функция на каждом обращении — это новый тип компонента, и Vue пересоздавал бы
 * поддерево вместо обновления, теряя состояние и ломая анимации.
 *
 * Пропы не объявлены намеренно: всё, что передали, попадает в `attrs`, и превью
 * получает набор целиком — от `size` до `ctrl`.
 */
export const PREVIEW_COMPONENTS: Record<string, Component> = Object.fromEntries(
	Object.entries(PREVIEWS).map(([id, render]) => [
		id,
		(_props: unknown, { attrs }: { attrs: Record<string, unknown> }) => render(attrs),
	]),
)
