<template>
	<div class="so-number-input">
		<!--
			NumberInput — поле числа: ввод и кнопки шага «меньше» и «больше».
			Корень — коробка поля семьи Input: рамка, высота размера, кольцо
			фокуса. Рисуется по `tag`, по умолчанию `div`. Состояния корня — как у
			DateInput: модификаторы размера, варианта, `--readonly`, `--required`,
			`--clearable` и `data-disabled`, `data-invalid`.

			Порядок узлов: слот `leading`, ввод, слот у конца числа, кнопки шага,
			значение для формы. Кнопки — последними из видимых, у края поля: их
			место не зависит от того, чем заняты слоты.
		-->

		<!--
			Слот `leading` — перед числом, как у Input. Обёртка рисуется, только
			когда слот задан.
		-->
		<div class="so-number-input__leading">
			<slot name="leading" />
		</div>

		<!--
			Ввод — число в формате языка страницы, одной строкой от Intl:
			«1 234,5», «12 %», «1 234,50 ₽», «5 кг». Своих узлов у валюты,
			процента и единицы нет. Фокус и клавиши шага — на нём: кольцо
			коробки горит по его фокусу. Подсказка — как у Input.
		-->
		<input type="text" class="so-number-input__input" />

		<!--
			Обёртка у конца числа — как у Input: по кнопке очистки, по своей
			кнопке в слоте `clear` или по слоту `trailing`. Кнопка очистки стоит
			в ней первой, перед содержимым `trailing`.
		-->
		<div class="so-number-input__trailing">
			<!--
				Кнопка очистки — та же, что у Input и DateInput, своя кнопка —
				слот `clear`. Вида у кнопки нет: тема красит её по контексту
				(`.so-number-input__clear`).
			-->
			<slot name="clear">
				<Button type="button" class="so-number-input__clear">
					<Icon />
				</Button>
			</slot>

			<slot name="trailing" />
		</div>

		<!--
			Кнопки шага — всегда, у конца поля, после слотов: «меньше», затем
			«больше». В RTL ряд зеркален, и «больше» стоит у левого края. Не
			остановки Tab и фокус не забирают: он остаётся во вводе. Удержание
			повторяет шаг до границы, и пока кнопку держат, на ней
			`data-pressed`. Вида у кнопок нет: тема красит их по контексту, как
			очистку.

			Значок — слот на каждую кнопку, как `trigger-icon` у DatePicker:
			заменяется значок, а кнопка с удержанием остаётся своей. По умолчанию
			— иконки ролей `minus` и `plus`.
		-->
		<div class="so-number-input__stepper">
			<Button type="button" class="so-number-input__decrement">
				<slot name="decrement-icon">
					<Icon />
				</slot>
			</Button>
			<Button type="button" class="so-number-input__increment">
				<slot name="increment-icon">
					<Icon />
				</slot>
			</Button>
		</div>

		<!--
			Значение для формы: `name` и `value` — число, а не текст ввода.
			Рисовать нечего.
		-->
		<input type="hidden" />
	</div>
</template>
