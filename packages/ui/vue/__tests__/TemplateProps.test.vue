<script setup lang="ts">
/**
 * Сторож: шаблон сверяет значения пропсов компонентов soldy с их типами.
 *
 * Тип пропсов для шаблона vue-tsc выводит из аннотации `setup(props: XProps)`
 * в `setup.component.ts`, а не из опции `props` (AGENTS.md, Pitfalls). Своя
 * аннотация у каждого компонента и каждой части — поэтому здесь все они.
 * Пропсы плагинов и `ctrl` приходят в тип своими путями (плагины дескриптора,
 * тип инстанса) и проверены отдельно.
 *
 * Файл не монтируется: негативные случаи ловит не vitest, а «Типы — Vue».
 * Неиспользованный `@vue-expect-error` — тоже ошибка, поэтому потерянная
 * проверка уронит типы, а не пройдёт молча. Рядом с каждым негативным случаем
 * тот же проп с верным значением, чтобы ошибка не оказалась ошибкой по другой
 * причине.
 */
import { TButton, TDragAndDrop, TInput } from '@soldy-ui/core'
import { ruRU } from '@soldy-ui/plugins'
import {
	Accordion,
	Button,
	Calendar,
	CheckBox,
	ComponentView,
	DateInput,
	DatePicker,
	Dialog,
	DragAndDrop,
	Drawer,
	Field,
	Frame,
	Icon,
	Input,
	Label,
	ListBox,
	LocaleProvider,
	Menu,
	NumberInput,
	Pagination,
	Popover,
	ProgressLinear,
	ProgressSpinner,
	RadioGroup,
	Rating,
	Scroller,
	Select,
	Skeleton,
	Slider,
	Switch,
	Table,
	Tabs,
	Tags,
	Toasts,
	Tooltip,
	Virtual,
} from '@soldy-ui/vue'
// Тост — внутренняя часть менеджера, наружу пакета не выходит, но аннотация
// пропсов у него своя
import { ToastsItem } from '../src/components/toasts/item'
// Страница — внутренняя часть пагинации, наружу пакета не выходит, но
// аннотация пропсов у неё своя
import { PaginationItem } from '../src/components/pagination/item'

const button = new TButton()
const input = new TInput()
const dragAndDrop = new TDragAndDrop()
</script>

<template>
	<!-- @vue-expect-error — режима выбора `many` нет -->
	<Accordion mode="many" />
	<Accordion mode="multiple" />

	<!-- @vue-expect-error — стрелка бывает только в начале или в конце -->
	<Accordion.Item arrowPlacement="middle" />
	<Accordion.Item arrowPlacement="end" />

	<!-- @vue-expect-error — текст кнопки строкой -->
	<Button :text="42" />
	<Button text="Сохранить" />

	<!-- @vue-expect-error — проп плагина: имя строкой -->
	<Button :aria_label="42" />
	<Button aria_label="Закрыть" />

	<!-- @vue-expect-error — чужой инстанс ядра -->
	<Button :ctrl="input" />
	<Button :ctrl="button" />

	<!-- @vue-expect-error — режима выбора `many` у календаря нет -->
	<Calendar mode="many" />
	<Calendar mode="range" />

	<!-- @vue-expect-error — дня недели 7 нет: 0 — воскресенье … 6 — суббота -->
	<Calendar :weekStart="7" />
	<Calendar :weekStart="1" />

	<!-- @vue-expect-error — месяцы сеток списком, а не строкой -->
	<Calendar months="2026-09-01" />
	<Calendar :months="['2026-09-01', '2026-10-01']" />

	<!-- @vue-expect-error — пояс «сегодня» строкой IANA -->
	<Calendar :timeZone="3" />
	<Calendar timeZone="Europe/Moscow" />

	<!-- @vue-expect-error — направления `up` нет -->
	<Calendar.Item direction="up" />
	<Calendar.Item direction="rtl" />

	<!-- @vue-expect-error — флаг, а не строка -->
	<CheckBox :indeterminate="'yes'" />
	<CheckBox indeterminate />

	<!-- @vue-expect-error — направления `up` нет -->
	<ComponentView direction="up" />
	<ComponentView direction="rtl" />

	<!-- @vue-expect-error — дата строкой YYYY-MM-DD, а не объектом Date -->
	<DateInput :value="new Date()" />
	<DateInput value="2026-05-12" />

	<!-- @vue-expect-error — граница строкой YYYY-MM-DD, а не объектом Date -->
	<DateInput :min="new Date()" />
	<DateInput min="2026-01-01" />

	<!-- @vue-expect-error — вид поля: дата или дата со временем -->
	<DateInput kind="month" />
	<DateInput kind="datetime" />

	<!-- @vue-expect-error — точность времени: до минуты или до секунды -->
	<DateInput timePrecision="hour" />
	<DateInput timePrecision="second" />

	<!-- @vue-expect-error — режима `multiple` у DatePicker нет: поле не покажет несколько дат -->
	<DatePicker mode="multiple" />
	<DatePicker mode="range" />

	<!-- @vue-expect-error — значение — дата строкой или парой, а не объектом Date -->
	<DatePicker :value="new Date()" />
	<DatePicker :value="['2026-05-12', '2026-05-20']" />

	<!-- @vue-expect-error — дня недели 7 нет: 0 — воскресенье … 6 — суббота -->
	<DatePicker :weekStart="7" />
	<DatePicker :weekStart="1" />

	<!-- @vue-expect-error — имя начала диапазона в форме строкой -->
	<DatePicker :startName="42" />
	<DatePicker startName="from" />

	<!-- @vue-expect-error — жест за полосу или за панель, а не флаг -->
	<DatePicker :swipe="true" />
	<DatePicker swipe="handle" />

	<!-- @vue-expect-error — кнопка очистки — флаг поля, а не строка -->
	<DatePicker :clearable="'yes'" />
	<DatePicker clearable />

	<!-- @vue-expect-error — места `left` у окна нет: стороны логические -->
	<Dialog placement="left" />
	<Dialog placement="start" />

	<!-- @vue-expect-error — ширина числом или строкой -->
	<Dialog :width="true" />
	<Dialog :width="480" />

	<!-- @vue-expect-error — отступ числом или строкой, а не флагом -->
	<Dialog :offset="true" />
	<Dialog offset="5%" />

	<!-- @vue-expect-error — флаг, а не строка -->
	<Dialog :dismissible="'no'" />
	<Dialog :dismissible="false" />

	<!-- @vue-expect-error — флаг, а не строка -->
	<Dialog :maximizable="'yes'" />
	<Dialog maximizable />

	<!-- @vue-expect-error — у DragAndDrop только свой инстанс -->
	<DragAndDrop :ctrl="button" />
	<DragAndDrop :ctrl="dragAndDrop" />

	<!-- @vue-expect-error — центра у выезжающей панели нет: она у края -->
	<Drawer placement="center" />
	<Drawer placement="bottom" />

	<!-- @vue-expect-error — жест за полосу или за панель, а не флаг -->
	<Drawer :swipe="true" />
	<Drawer swipe="handle" />

	<!-- @vue-expect-error — флаг, а не строка -->
	<Drawer :contained="'yes'" />
	<Drawer contained />

	<!-- @vue-expect-error — ширина числом или строкой -->
	<Drawer :width="true" />
	<Drawer :width="360" />

	<!-- @vue-expect-error — стороны `left` у подписи поля нет: стороны логические -->
	<Field position="left" />
	<Field position="start" />

	<!-- @vue-expect-error — ошибка поля — флаг, а не строка -->
	<Field :invalid="'yes'" />
	<Field invalid />

	<!-- @vue-expect-error — подсказка строкой -->
	<Field :helper="42" />
	<Field helper="Не покажем никому" />

	<!-- @vue-expect-error — позиционирования `sticky` нет -->
	<Frame position="sticky" />
	<Frame position="absolute" />

	<!-- @vue-expect-error — проп плагина: стороны `middle` нет -->
	<Frame anchor_placement="middle" />
	<Frame anchor_placement="top" />

	<!-- @vue-expect-error — ширина числом или строкой -->
	<Icon :width="true" />
	<Icon :width="24" />

	<!-- @vue-expect-error — плейсхолдер строкой -->
	<Input :placeholder="42" />
	<Input placeholder="Поиск" />

	<!-- @vue-expect-error — стороны `left` у подписи нет: стороны логические -->
	<Label position="left" />
	<Label position="start" />

	<!-- @vue-expect-error — индикатора `middle` нет -->
	<ListBox indicator="middle" />
	<ListBox indicator="end" />

	<!-- @vue-expect-error — флаг, а не строка -->
	<ListBox.Item :selected="'yes'" />
	<ListBox.Item selected />

	<!-- @vue-expect-error — локаль объектом (`ruRU`), а не тегом -->
	<LocaleProvider locale="ru-RU" />
	<LocaleProvider :locale="ruRU" />

	<!-- @vue-expect-error — стороны `left` у меню нет: сторона и выравнивание -->
	<Menu placement="left" />
	<Menu placement="bottom-end" />

	<!-- @vue-expect-error — флаг, а не строка -->
	<Menu :open="'yes'" />
	<Menu open />

	<!-- @vue-expect-error — текст пункта строкой -->
	<Menu.Item :text="42" />
	<Menu.Item text="Изменить" />

	<!-- @vue-expect-error — вариант пункта — имя темы, а `rainbow` она не объявила -->
	<Menu.Item variant="rainbow" />
	<Menu.Item variant="brand" />

	<!-- @vue-expect-error — отметка флажка — флаг, а не строка -->
	<Menu.CheckboxItem :selected="'yes'" />
	<Menu.CheckboxItem selected />

	<!-- @vue-expect-error — подпись группы строкой -->
	<Menu.Group :label="42" />
	<Menu.Group label="Вид" />

	<!-- @vue-expect-error — направления `up` нет -->
	<Menu.Separator direction="up" />
	<Menu.Separator direction="rtl" />

	<!-- @vue-expect-error — число элементов числом, а не строкой -->
	<Pagination total="100" />
	<Pagination :total="100" />

	<!-- @vue-expect-error — середина окна числом, а не строкой -->
	<Pagination middleCount="5" />
	<Pagination :middleCount="5" />

	<!-- @vue-expect-error — страницы текстовой пагинации — объекты с текстом, а не строки -->
	<Pagination :pages="['Админ', 'Записи']" />
	<Pagination :pages="[{ text: 'Админ', value: 'admin' }, { text: 'Записи' }]" />

	<!-- @vue-expect-error — ключ страницы строкой или числом -->
	<Pagination :value="{}" />
	<Pagination value="admin" />

	<!-- @vue-expect-error — направления `up` нет -->
	<PaginationItem direction="up" />
	<PaginationItem direction="rtl" />

	<!-- @vue-expect-error — стороны `left` у поповера нет: сторона и выравнивание -->
	<Popover placement="left" />
	<Popover placement="top-end" />

	<!-- @vue-expect-error — флаг, а не строка -->
	<Popover :lazyMount="'yes'" />
	<Popover lazyMount />

	<!-- @vue-expect-error — жест за полосу или за панель, а не флаг -->
	<Popover :swipe="true" />
	<Popover swipe="handle" />

	<!-- @vue-expect-error — доля числом, а не строкой -->
	<ProgressLinear value="40" />
	<ProgressLinear :value="40" />

	<!-- @vue-expect-error — бег — флаг `indeterminate`, у значения `null` нет -->
	<ProgressLinear :value="null" />
	<ProgressLinear indeterminate />

	<!-- @vue-expect-error — оси `diagonal` нет -->
	<ProgressLinear orientation="diagonal" />
	<ProgressLinear orientation="vertical" />

	<!-- @vue-expect-error — доля числом, а не строкой -->
	<ProgressSpinner value="40" />
	<ProgressSpinner :value="40" />

	<!-- @vue-expect-error — бег — флаг `indeterminate`, у значения `null` нет -->
	<ProgressSpinner :value="null" />
	<ProgressSpinner indeterminate />

	<!-- @vue-expect-error — атрибуты вьюпорта набором, а не строкой роли -->
	<Scroller viewportAria="listbox" />
	<Scroller :viewportAria="{ role: 'listbox' }" />

	<!-- @vue-expect-error — вида `stars` у радио нет -->
	<RadioGroup view="stars" />
	<RadioGroup view="halo" />

	<!-- @vue-expect-error — флаг, а не строка -->
	<RadioGroup.Item :active="'yes'" />
	<RadioGroup.Item active />

	<!-- @vue-expect-error — стороны `left` у панели нет -->
	<Select placement="left" />
	<Select placement="top" />

	<!-- @vue-expect-error — жест за полосу или за панель, а не флаг -->
	<Select :swipe="true" />
	<Select swipe="panel" />

	<!-- @vue-expect-error — текст опции строкой -->
	<Select.Item :text="42" />
	<Select.Item text="Первый" />

	<!-- @vue-expect-error — число поля — числом, а не строкой -->
	<NumberInput value="4" />
	<NumberInput :value="4" />

	<!-- @vue-expect-error — граница числом -->
	<NumberInput min="0" />
	<NumberInput :min="0" />

	<!-- @vue-expect-error — сокращённую запись поле обратно не разберёт -->
	<NumberInput :formatOptions="{ notation: 'compact' }" />
	<NumberInput :formatOptions="{ style: 'percent' }" />

	<!-- @vue-expect-error — знак, который прячет минус, поле не пускает -->
	<NumberInput :formatOptions="{ signDisplay: 'never' }" />
	<NumberInput :formatOptions="{ signDisplay: 'exceptZero' }" />

	<!-- @vue-expect-error — оценка числом, а не строкой -->
	<Rating value="4" />
	<Rating :value="4" />

	<!-- @vue-expect-error — шаг числом -->
	<Rating step="half" />
	<Rating :step="0.5" />

	<!-- @vue-expect-error — высота числом или строкой -->
	<Skeleton :height="true" />
	<Skeleton height="1em" />

	<!-- @vue-expect-error — значение числом или массивом чисел, а не строкой -->
	<Slider value="30" />
	<Slider :value="[20, 80]" />

	<!-- @vue-expect-error — оси `diagonal` нет -->
	<Slider orientation="diagonal" />
	<Slider orientation="vertical" />

	<!-- @vue-expect-error — метки списком — это значения с подписями, а не числа -->
	<Slider :marks="[20, 80]" />
	<Slider :marks="[{ value: 20, label: 'Мало' }]" />

	<!-- @vue-expect-error — щелчка `sticky` нет -->
	<Slider snap="sticky" />
	<Slider snap="magnet" />

	<!-- @vue-expect-error — флаг, а не строка -->
	<Switch :required="'yes'" />
	<Switch required />

	<!-- @vue-expect-error — режима выбора строк `many` нет -->
	<Table mode="many" />
	<Table mode="multiple" />

	<!-- @vue-expect-error — колонка данными без поля: по нему колонки сверяются -->
	<Table :columns="[{ text: 'Имя' }]" />
	<Table :columns="[{ field: 'name', text: 'Имя', rowHeader: true }]" />

	<!-- @vue-expect-error — направления `up` у сортировки нет -->
	<Table :sort="[{ field: 'name', direction: 'up' }]" />
	<Table :sort="[{ field: 'name', direction: 'desc' }]" />

	<!-- @vue-expect-error — флаг, а не строка -->
	<Table.Column :visible="'yes'" />
	<Table.Column direction="rtl" />

	<!-- @vue-expect-error — направления письма `up` нет -->
	<Table.Row direction="up" />
	<Table.Row direction="rtl" />

	<!-- @vue-expect-error — опечатка в ориентации -->
	<Tabs orientation="vertcal" />
	<Tabs orientation="vertical" />

	<!-- @vue-expect-error — флаг, а не строка -->
	<Tabs.Item :closable="'yes'" />
	<Tabs.Item closable />

	<!-- @vue-expect-error — значение таба строкой или числом -->
	<Tabs.Content :value="{}" />
	<Tabs.Content value="a" />

	<!-- @vue-expect-error — флаг, а не строка -->
	<Tags :closable="'yes'" />
	<Tags closable />

	<!-- @vue-expect-error — текст тега строкой -->
	<Tags.Item :text="42" />
	<Tags.Item text="Москва" />

	<!-- @vue-expect-error — вариант тега — имя темы, а `rainbow` она не объявила -->
	<Tags.Item variant="rainbow" />
	<Tags.Item variant="brand" />

	<!-- @vue-expect-error — места `left` у региона нет: край и сторона строки -->
	<Toasts placement="left" />
	<Toasts placement="top-start" />

	<!-- @vue-expect-error — раскладки `grid` нет: столбец или стопка -->
	<Toasts layout="grid" />
	<Toasts layout="cascade" />

	<!-- @vue-expect-error — предел видимых числом, а не строкой -->
	<Toasts max="3" />
	<Toasts :max="3" />

	<!-- @vue-expect-error — длительность числом, а не строкой -->
	<Toasts duration="5s" />
	<Toasts :duration="0" />

	<!-- @vue-expect-error — текст тоста строкой -->
	<ToastsItem :text="42" />
	<ToastsItem text="Сохранено" />

	<!-- @vue-expect-error — флаг, а не строка -->
	<ToastsItem :alert="'yes'" />
	<ToastsItem alert />

	<!-- @vue-expect-error — вида `danger` у тоста нет: info, success, warning или error -->
	<ToastsItem type="danger" />
	<ToastsItem type="error" />

	<!-- @vue-expect-error — ожидание — флаг, а не строка -->
	<ToastsItem :loading="'yes'" />
	<ToastsItem loading />

	<!-- @vue-expect-error — стороны `left` у подсказки нет: сторона и выравнивание -->
	<Tooltip placement="left" />
	<Tooltip placement="top" />

	<!-- @vue-expect-error — задержка числом, а не строкой -->
	<Tooltip openDelay="fast" />
	<Tooltip :openDelay="0" />

	<!-- @vue-expect-error — режима `name` у подсказки нет: описание или имя -->
	<Tooltip type="name" />
	<Tooltip type="label" />

	<!-- @vue-expect-error — окно включают флагом, а не строкой -->
	<Virtual :enabled="'on'" />
	<Virtual :enabled="false" />
</template>
