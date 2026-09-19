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
import { TButton, TDragAndDrop, TInput } from '@soldy/core'
import {
	Accordion,
	Button,
	CheckBox,
	ComponentView,
	DragAndDrop,
	Frame,
	Icon,
	Input,
	Label,
	ListBox,
	RadioGroup,
	Select,
	Skeleton,
	Spinner,
	Switch,
	Tabs,
	Tags,
} from '@soldy/ui-vue'

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

	<!-- @vue-expect-error — флаг, а не строка -->
	<CheckBox :indeterminate="'yes'" />
	<CheckBox indeterminate />

	<!-- @vue-expect-error — направления `up` нет -->
	<ComponentView direction="up" />
	<ComponentView direction="rtl" />

	<!-- @vue-expect-error — у DragAndDrop только свой инстанс -->
	<DragAndDrop :ctrl="button" />
	<DragAndDrop :ctrl="dragAndDrop" />

	<!-- @vue-expect-error — позиционирования `sticky` нет -->
	<Frame position="sticky" />
	<Frame position="absolute" />

	<!-- @vue-expect-error — проп плагина: стороны `middle` нет -->
	<Frame anchor_placement="middle" />
	<Frame anchor_placement="top-end" />

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

	<!-- @vue-expect-error — вида `stars` у радио нет -->
	<RadioGroup view="stars" />
	<RadioGroup view="halo" />

	<!-- @vue-expect-error — флаг, а не строка -->
	<RadioGroup.Item :active="'yes'" />
	<RadioGroup.Item active />

	<!-- @vue-expect-error — стороны `left` у панели нет -->
	<Select placement="left" />
	<Select placement="top" />

	<!-- @vue-expect-error — текст опции строкой -->
	<Select.Item :text="42" />
	<Select.Item text="Первый" />

	<!-- @vue-expect-error — высота числом или строкой -->
	<Skeleton :height="true" />
	<Skeleton height="1em" />

	<!-- @vue-expect-error — толщина числом или `auto` -->
	<Spinner borderWidth="thick" />
	<Spinner :borderWidth="2" />

	<!-- @vue-expect-error — флаг, а не строка -->
	<Switch :required="'yes'" />
	<Switch required />

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

	<!-- @vue-expect-error — подпись кнопки закрытия строкой -->
	<Tags.Item :closeLabel="42" />
	<Tags.Item closeLabel="Удалить" />
</template>
