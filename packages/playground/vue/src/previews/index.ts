import { h, type Component } from 'vue'
import type { DescriptorSlots, PopoverDescriptor } from '@soldy/setup'
import { COLLECTION_ITEMS } from '@soldy/playground-shared'
import {
	Accordion,
	Button,
	CheckBox,
	ComponentView,
	DragAndDrop,
	Icon,
	Input,
	Label,
	ListBox,
	Popover,
	RadioGroup,
	Select,
	Skeleton,
	Spinner,
	Switch,
	Tabs,
	Tags,
	useIcon,
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

/** Scope слота `trigger` у Popover — из объявления слота в дескрипторе. */
type TPopoverTriggerScope = DescriptorSlots<typeof PopoverDescriptor>['trigger']

/**
 * Содержимое коллекций — из общего манифеста: состав нужен не только здесь.
 * Пресеты строк тоже им пользуются (`tags_overflow` у Select выбирает всё).
 */
const ITEMS = COLLECTION_ITEMS

/**
 * Иконка превью Icon.
 *
 * `tag` у Icon — корень: тег или компонент, и глиф рисует компонент
 * `useIcon(роль)`. Строка с ролью (`tag: 'arrowDown'`) давала пустой
 * элемент `<arrowdown>`, и ячейка Icon на витрине была пустой. Компонент
 * строится один раз: новый на каждый рендер Vue пересоздавал бы узел.
 */
const ARROW_DOWN = useIcon('arrowDown')

/** Слои наследования: у них нет своей разметки, показываем пустую коробку. */
const layer =
	(label: string): TPreview =>
	(bind) =>
		h(ComponentView, bind, { default: () => label })

export const PREVIEWS: Record<string, TPreview> = {
	// Подпись — пропом `text`, а не слотом: заданный слот `default` перекрывает
	// проп, и строка `text` на странице свойств не меняла бы ничего видимого
	button: (bind) => h(Button, { text: 'Кнопка', ...bind }),

	input: (bind) => h(Input, { placeholder: 'Введите текст', ...bind }),

	// Текста у чекбокса и переключателя нет, оба — голый контрол: подпись даёт
	// обёртка Label. Её пропы задаёт превью, строки страницы правят контрол
	'check-box': (bind) => h(Label, { text: 'Согласен' }, () => h(CheckBox, bind)),

	switch: (bind) => h(Label, { text: 'Включено' }, () => h(Switch, bind)),

	// Подпись — пропом `text`, контрол — слотом. Строки страницы правят саму
	// подпись: сторону, размер текста, вариант
	label: (bind) => h(Label, { text: 'Согласен', ...bind }, () => h(CheckBox)),

	// Подпись — слотом: текста у радио нет, оно голый контрол, как CheckBox
	'radio-group': (bind) =>
		h(RadioGroup as Component, bind, () =>
			ITEMS.map((item) =>
				h(RadioGroup.Item, { key: item.value, value: item.value }, () => item.text),
			),
		),

	// `editable: true` в дефолте, а не только на строке самого пропа — иначе
	// строка `editableMode` показывала бы select без ввода вовсе: `editable`
	// на ней не тронут и остаётся `false` от `defaultValues` ядра, ввод в
	// поле невозможен, и подсветка по тексту ничем не отличалась бы от её
	// отсутствия
	select: (bind) =>
		h(Select as Component, { placeholder: 'Выберите', editable: true, ...bind }, () =>
			ITEMS.map((item) => h(Select.Item, { key: item.value, ...item })),
		),

	// Триггер — Button, связку с панелью и вид «нажат» он берёт из scope
	// слота. В содержимом есть кнопка: на неё при открытии уходит фокус
	popover: (bind) =>
		h(
			Popover as Component,
			{ aria_label: 'Пример поповера', ...bind },
			{
				trigger: ({ triggerAria, triggerDataset }: TPopoverTriggerScope) =>
					h(Button, { text: 'Открыть', ...triggerAria, ...triggerDataset }),
				default: () => [
					h(
						'p',
						{ style: 'margin:0 0 8px' },
						'Произвольное содержимое: текст, поля, кнопки',
					),
					h(Button, { text: 'Действие' }),
				],
			},
		),

	'list-box': (bind) =>
		h(ListBox as Component, bind, () =>
			ITEMS.map((item) => h(ListBox.Item, { key: item.value, ...item })),
		),

	tabs: (bind) =>
		h(Tabs as Component, bind, {
			// Первый таб активен сразу — иначе ни одна панель не смонтируется
			// (`rendered && active`), и стенд никогда не покажет содержимое
			default: () =>
				ITEMS.map((item, index) =>
					h(Tabs.Item, { key: item.value, active: index === 0, ...item }),
				),
			content: () =>
				ITEMS.map((item) =>
					h(Tabs.Content, { key: `c-${item.value}`, value: item.value }, () =>
						h('div', { style: 'padding:12px' }, `Панель «${item.text}»`),
					),
				),
		}),

	/**
	 * Состав — пропом `items`, а не разметкой: объявленный потребителем ряд
	 * принадлежит ему, и коллекция его не делит — `overflow="popover"` тогда
	 * не даёт ни кнопки «…», ни панели, теги просто обрезает (см. запасное
	 * содержимое в `Tags.vue`). Делит она только свой состав.
	 *
	 * Обёртка — граница ширины: ряд обязан быть ровно по ячейке, иначе замер
	 * меряет не ту ширину и `overflow` не срабатывает вовсе.
	 *
	 * Ширина — явная, `100%`. Сцена ячейки (`.pg-col__stage`) — флексбокс, а у
	 * флекс-элемента автоминимум равен его содержимому: с шириной по
	 * содержимому ряд держал свои 516px в колонке шириной 214 — теги уходили
	 * за край, замер считал по 516 и кнопку «…» не показывал, а прокрутка в
	 * `scroll` не появлялась, потому что прокручивать было нечего.
	 *
	 * Обрезка — не её дело: ряд в `popover` обрезает себя сам, в `scroll`
	 * прокручивает, в `wrap` переносит (`themes/oren/.../_tags.scss`).
	 *
	 * Сторожит `browser/tags-preview.spec.ts` — на самой странице стенда.
	 */
	tags: (bind) =>
		h('div', { style: 'width:100%' }, [h(Tags as Component, { items: ITEMS, ...bind })]),

	accordion: (bind) =>
		h(Accordion as Component, bind, () =>
			ITEMS.map((item) =>
				h(Accordion.Item, { key: item.value, ...item }, () =>
					h('div', { style: 'padding:4px 0' }, `Содержимое «${item.text}»`),
				),
			),
		),

	icon: (bind) => h(Icon, { tag: ARROW_DOWN, ...bind }),

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
 * Функции отрисовки как компоненты — их принимает `<component :is>`.
 *
 * Обёртки строятся один раз при загрузке модуля, а не на каждый рендер: новая
 * функция на каждом обращении — это новый тип компонента, и Vue пересоздавал бы
 * поддерево вместо обновления, теряя состояние и ломая анимации. Так же
 * обёрнуты и фикстуры сценариев.
 *
 * Пропы не объявлены намеренно: всё, что передали, попадает в `attrs`, и превью
 * получает набор целиком — от `size` до `ctrl`.
 */
export function toComponents(previews: Record<string, TPreview>): Record<string, Component> {
	return Object.fromEntries(
		Object.entries(previews).map(([id, render]) => [
			id,
			(_props: unknown, { attrs }: { attrs: Record<string, unknown> }) => render(attrs),
		]),
	)
}

/** Превью как компоненты. */
export const PREVIEW_COMPONENTS: Record<string, Component> = toComponents(PREVIEWS)
