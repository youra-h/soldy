<script lang="ts">
import SetupDateInput from './setup.component'

export default { ...SetupDateInput }
</script>

<template>
	<component
		ref="rootElement"
		:is="tag"
		v-if="rendered"
		v-show="visible"
		:id="id"
		:class="classes"
		v-bind="{ ...attrs, ...aria, ...dataset }"
	>
		<!--
			DateInput — поле даты из частей по формату локали: день, месяц и год в
			порядке и с разделителями `Intl.DateTimeFormat#formatToParts`. Корень —
			коробка поля семьи Input: рамка, высота размера, кольцо фокуса.
			Рисуется по `tag`, по умолчанию `div`. На корне наборы `attrs` (`dir`
			поля), `aria` (`role="group"`, имя — `aria_label` или
			`aria_labelledBy`) и `dataset` (`data-disabled`, `data-invalid`).
			Модификаторы — размер, вариант, `--readonly`, `--required`.

			Обработчиков в разметке нет: клавиши, буфер обмена, выделение и
			контекстное меню ловят плагины на корне. Атрибуты снаружи падают на
			корень.
		-->

		<!--
			Слот `leading` — перед датой, со scope `{ ctrl }`, как у Input. Обёртка
			рисуется, только когда слот задан.
		-->
		<div v-if="$slots.leading" class="s-date-input__leading">
			<slot name="leading" :ctrl="ctrl" />
		</div>

		<!--
			Ряд частей. Каждая часть и каждый разделитель — своя коробка: ряд —
			флекс, а не строка текста. В строчной раскладке Chrome переносит
			начало выделения от левого края части в соседний текст, и протяжка
			мышью с края дня ничего не выделяет.

			Направление и язык ряда — набор ядра `segmentsAttrs`: `dir` по дате в
			локали (`ar-EG` — справа налево, `he-IL` — слева направо и на странице
			справа налево; не `dir="auto"`: подсказки из букв иврита перевернули
			бы ряд, когда дату наберут) и `lang` формата. Направление поля
			(`direction` компонента) ставит слоты и сам ряд у начала поля, а не
			части внутри ряда.

			Части и разделители — перебор выхода ядра `segments` в порядке формата.
			Ключ части — её тип: при смене локали часть меняет место, а узел
			остаётся тем же; ключ разделителя — место в формате.

			Часть — день, месяц или год: текст — набранное в цифрах локали или
			подсказка пустой части. Наборы части: `attrs` (на сенсорном устройстве
			— `contenteditable` и `inputmode`), `aria` (`role="spinbutton"`, имя
			части, `aria-value*`, `aria-invalid`, `tabindex` — у каждой части своя
			остановка Tab, у выключенного поля ни одной; `id` части) и `dataset`
			(`data-type`, `data-placeholder`). Сервер и компьютер рисуют часть
			нередактируемой: дату выделяют протяжкой мышью, а в редактируемой части
			выделение застревает. Редактируемой её делает касание пальцем или
			пером — ради экранной клавиатуры; набор пишет плагин, а текст части
			всё равно пишет ядро.

			Разделитель — литерал `formatToParts` как есть: с пробелами
			(`ko-KR` — «. ») и метками направления (`ar-EG` — RLM). Скрыт от
			скринридера (`aria-hidden` в его наборе): дату объявляют части.
		-->
		<span class="s-date-input__segments" v-bind="segmentsAttrs">
			<template v-for="segment in segments" :key="segment.key">
				<span
					v-if="segment.type === 'literal'"
					class="s-date-input__literal"
					v-bind="segment.aria"
					>{{ segment.text }}</span
				>
				<span
					v-else
					class="s-date-input__segment"
					v-bind="{ ...segment.attrs, ...segment.aria, ...segment.dataset }"
					>{{ segment.text }}</span
				>
			</template>
		</span>

		<!--
			Слот `trailing` — после даты, со scope `{ ctrl }`: сюда DatePicker
			поставит кнопку календаря. Обёртка рисуется, только когда слот задан;
			тема ставит её у конца поля.
		-->
		<div v-if="$slots.trailing" class="s-date-input__trailing">
			<slot name="trailing" :ctrl="ctrl" />
		</div>

		<!--
			Значение для формы: `name` и `value` — дата строкой `YYYY-MM-DD`,
			пустая, пока дата не собрана целиком. Выключенное поле в форму не
			уходит, как любое выключенное поле.
		-->
		<input type="hidden" :name="name" :value="value" :disabled="disabled" />
	</component>
</template>
