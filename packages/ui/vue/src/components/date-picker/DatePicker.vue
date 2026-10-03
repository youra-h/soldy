<template>
	<div class="s-date-picker">
		<!--
			DatePicker — поле даты и календарь в панели, как Select — поле и
			список. Корень — якорь панели: она открывается под ним от его
			начала, у края окна — над ним. Своей коробки у корня одной даты нет,
			у диапазона корень и есть коробка поля (`--range`).

			Ниже оба режима подряд: одна дата и диапазон. В разметке стоит
			один из них — по `mode`.
		-->

		<!--
			Одна дата. Поле — готовый DateInput: коробка, части, кольцо фокуса и
			ошибка — его. Кнопка календаря — в его слоте `trailing`: обёртку
			слота у конца поля держит тема DateInput.
		-->
		<DateInput class="s-date-picker__field">
			<template #trailing>
				<!--
					Кнопка календаря. Вида нет: тема красит её по контексту, как
					очистку Select. Пока панель открыта, она нажата (`data-selected`).
					Значок — слот `trigger-icon`, по умолчанию иконка роли
					`calendar`.
				-->
				<Button class="s-date-picker__trigger">
					<slot name="trigger-icon">
						<Icon />
					</slot>
				</Button>
			</template>
		</DateInput>

		<!--
			Диапазон: поле начала, тире, поле конца и кнопка — одна коробка на
			корне. Поля внутри без своей рамки (тема, по контексту), кнопка — после
			поля конца, а не в его слоте: она выбирает весь период, а не конец.
			Тире — для глаза, скринридеру оно не нужно: поля называют свои концы
			сами.
		-->
		<DateInput class="s-date-picker__start" />
		<span class="s-date-picker__dash">–</span>
		<DateInput class="s-date-picker__end" />
		<Button class="s-date-picker__trigger">
			<slot name="trigger-icon">
				<Icon />
			</slot>
		</Button>

		<!--
			Панель — Frame, телепорт в `body`: поверхность, кромка и тень — как у
			панелей Select и Popover. Открытость — `visible` панели, как у Select:
			закрытая панель прячется, а не размонтируется. Подложки, крестика и
			подвала нет — нажатие мимо закрывает панель.
		-->
		<Frame class="s-date-picker__panel">
			<!--
				Календарь — готовый Calendar. Своей поверхности у него нет, её даёт
				панель. Содержимое дня — слот `item` DatePicker, отданный календарю
				под тем же именем, со scope `{ item }`.
			-->
			<Calendar class="s-date-picker__calendar">
				<template #item>
					<slot name="item" />
				</template>
			</Calendar>
		</Frame>
	</div>
</template>
