<script lang="ts">
import { Button } from '../button'
import { Icon } from '../icon'
import SetupNumberInput from './setup.component'

export default { ...SetupNumberInput, components: { Button, Icon } }
</script>

<template>
	<component
		ref="rootElement"
		:is="tag"
		v-if="rendered"
		v-show="visible"
		:class="classes"
		v-bind="{ ...attrs, ...dataset, ...containerAttrs }"
	>
		<!--
			NumberInput — поле числа: ввод и кнопки шага «меньше» и «больше».
			Корень — коробка поля семьи Input: рамка, высота размера, кольцо
			фокуса. Рисуется по `tag`, по умолчанию `div`. На корне — `attrs`
			(`dir` поля) и `dataset` (`data-disabled`, `data-invalid`): тема
			красит коробку и подпись поля формы по корню, а `aria` — у ввода.
			Модификаторы — размер, вариант, `--readonly`, `--required`,
			`--clearable`. Атрибуты снаружи делятся, как у Input: класс и стиль —
			корню, остальное — вводу.

			Порядок узлов: слот `leading`, ввод, слот у конца числа, кнопки шага,
			значение для формы. Кнопки — последними из видимых, у края поля: их
			место не зависит от того, чем заняты слоты.

			Обработчик в разметке один — нажатие кнопки очистки: набор, клавиши и
			кнопки шага ловят плагины на корне.
		-->

		<!--
			Слот `leading` — перед числом, со scope `{ ctrl }`, как у Input.
			Обёртка рисуется, только когда слот задан.
		-->
		<div v-if="$slots.leading" class="so-number-input__leading">
			<slot name="leading" :ctrl="ctrl" />
		</div>

		<!--
			Ввод — число в формате языка страницы, одной строкой от Intl:
			«1 234,5», «12 %», «1 234,50 ₽», «5 кг». Своих узлов у валюты,
			процента и единицы нет. Текст — буфер правки ядра (`text`): пока
			набирают, набранное, а после — строка формата. Пишет его фреймворк,
			когда текст ядра сменился; правку, которую ядро не взяло, плагин
			набора возвращает сам.

			Наборы ядра: `inputAttrs` — `dir` и `lang` числа (направление числа в
			локали, а не поля: у валюты `ru-RU` порядок знаков верен только слева
			направо, у `he-IL` — справа налево) и экранная клавиатура
			(`inputmode`); `aria` — имя, справка, ошибка, `aria-required` у поля
			только для чтения; `inputAria` — роль `spinbutton` и `aria-value*`.
			Фокус и клавиши шага — на вводе: кольцо коробки горит по его фокусу.
			Подсказка — как у Input. Ни проверки орфографии, ни автозаполнения:
			число — не слово.
		-->
		<input
			type="text"
			class="so-number-input__input"
			:id="id"
			:value="text"
			:placeholder="placeholder"
			:disabled="disabled"
			:readonly="readonly"
			:required="required"
			autocomplete="off"
			spellcheck="false"
			v-bind="{ ...inputAttrs, ...aria, ...inputAria, ...controlAttrs }"
		/>

		<!--
			Обёртка у конца числа — как у Input: по кнопке очистки, по своей
			кнопке в слоте `clear` или по слоту `trailing`. Кнопка очистки стоит
			в ней первой, перед содержимым `trailing`.
		-->
		<div v-if="clearable || $slots.clear || $slots.trailing" class="so-number-input__trailing">
			<!--
				Кнопка очистки — та же, что у Input и DateInput: по `clearable`,
				выключена вместе с полем, `readonly` её не гасит. Имя ядро
				собирает с именем поля (`clearAria`), очищает команда поля `clear`
				— и значение, и набранный текст. Клик не всплывает до корня. Своя
				кнопка — слот `clear`: заменяет встроенную целиком и рисуется,
				когда задана.

				Вида у кнопки нет: тема красит её по контексту
				(`.so-number-input__clear`).
			-->
			<slot name="clear" :clear="ctrl.clear">
				<Button
					embedded="number-input.clear"
					type="button"
					v-if="clearable"
					class="so-number-input__clear"
					:size="size"
					:disabled="disabled"
					@click.stop="ctrl.clear()"
					v-bind="clearAria"
				>
					<Icon embedded="number-input.clear-icon" :tag="clearIconTag" :size="size" />
				</Button>
			</slot>

			<slot name="trailing" :ctrl="ctrl" />
		</div>

		<!--
			Кнопки шага — всегда, у конца поля, после слотов: «меньше», затем
			«больше». В RTL ряд зеркален, и «больше» стоит у левого края. Не
			остановки Tab (`tabindex` в наборах ядра) и фокус не забирают: нажатие
			гасит плагин кнопок, и фокус остаётся во вводе. Удержание повторяет
			шаг до границы, и пока кнопку держат, на ней `data-pressed` — набор
			кнопки (`decrementDataset`, `incrementDataset`). Выключена кнопка у
			своего края, у выключенного поля и только для чтения. Имена — с
			именем поля, от локали (`decrementAria`, `incrementAria`).

			Вида у кнопок нет: тема красит их по контексту, как очистку. Значок —
			слот на каждую кнопку, как `trigger-icon` у DatePicker: заменяется
			значок, а кнопка с удержанием остаётся своей. По умолчанию — иконки
			ролей `minus` и `plus` размером поля.
		-->
		<div class="so-number-input__stepper">
			<Button
				embedded="number-input.decrement"
				type="button"
				class="so-number-input__decrement"
				:size="size"
				:disabled="decrementDisabled"
				v-bind="{ ...decrementAria, ...decrementDataset }"
			>
				<slot name="decrement-icon">
					<Icon embedded="number-input.decrement-icon" :tag="minusIconTag" :size="size" />
				</slot>
			</Button>
			<Button
				embedded="number-input.increment"
				type="button"
				class="so-number-input__increment"
				:size="size"
				:disabled="incrementDisabled"
				v-bind="{ ...incrementAria, ...incrementDataset }"
			>
				<slot name="increment-icon">
					<Icon embedded="number-input.increment-icon" :tag="plusIconTag" :size="size" />
				</slot>
			</Button>
		</div>

		<!--
			Значение для формы: `name` и `value` — число, а не текст ввода
			(«1234.5», а не «1 234,5 ₽»); пустое, пока числа нет. Выключенное
			поле в форму не уходит, как любое выключенное поле.
		-->
		<input type="hidden" :name="name" :value="value" :disabled="disabled" />
	</component>
</template>
