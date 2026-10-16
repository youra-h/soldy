<script lang="ts">
import SetupRating from './setup.component'

export default { ...SetupRating }
</script>

<template>
	<component
		ref="rootElement"
		:is="tag"
		v-if="rendered"
		v-show="visible"
		:class="classes"
		v-bind="{ ...attrs, ...dataset }"
	>
		<!--
			Оценка звёздами — ползунок с одной ручкой (APG, Rating Slider):
			значение — число на шкале от 0 до `max`, звёзды — его зрительная
			шкала. Корень рисуется по `tag`, по умолчанию `span`: оценку кладут в
			подпись `Label`, а внутри `label` HTML разрешает только строчную
			разметку. Поэтому и всё внутри — `span`.

			Размер, вариант и только чтение приходят классами корня (`--size-*`,
			`--variant-*`, `--readonly`), состояние — набором `dataset`
			(`data-disabled`), `dir` — в `attrs`. Обработчиков здесь нет: нажатие
			ловит плагин указателя на корне, наведение — плагин наведения там же,
			клавиши и жест скринридера — плагин клавиатуры на поле.
		-->

		<!--
			Дорожка — ряд звёзд. Ячейки равные и встык, поэтому доля её коробки
			по оси — доля шкалы: точку указателя в значение переводят по
			дорожке, не зная о звёздах. Ручку и поле плагины находят по классам
			и только прямыми детьми, как у Slider: `__thumb` — ребёнок дорожки,
			`input` — ребёнок ручки.
		-->
		<span class="so-rating__track">
			<!--
				Звезда — по одной на единицу шкалы, под `aria-hidden`: значение
				объявляет поле. Доля заливки — в `style` звезды
				(`--so-rating-fraction`, число от 0 до 1), от предпросмотра
				наведением, пока он идёт, иначе от значения. Слоёв два, оба —
				одна иконка: пустая звезда снизу и залитая сверху, в слое,
				обрезанном по доле. Поэтому заливка бывает любой долей, а не только
				половиной.

				Иконка — `svg` роли `star`, а не компонент Icon, как отметка
				CheckBox: иконок по две на звезду, а оценок в списке отзывов —
				десятки. Размер и цвет ей даёт тема по слою. Слот `icon` заменяет
				иконку в обоих слоях; какой слой он рисует, говорит `filled`, какую
				звезду — `value`.
			-->
			<span
				v-for="star in stars"
				:key="star.value"
				class="so-rating__star"
				:style="star.style"
				aria-hidden="true"
			>
				<slot name="icon" :value="star.value" :filled="false">
					<component :is="defaultIconTag" class="so-rating__icon" />
				</slot>
				<span class="so-rating__star-fill">
					<slot name="icon" :value="star.value" :filled="true">
						<component :is="defaultIconTag" class="so-rating__icon" />
					</slot>
				</span>
			</span>

			<!--
				Ручка — невидимая, во весь ряд: в ней поле, и кольцо фокуса тема
				рисует на ней — вокруг всего ряда.
			-->
			<span class="so-rating__thumb">
				<!--
					Нативное поле, как у Slider: мобильный скринридер двигает его
					своим жестом, `name`, `disabled` и отправку формы даёт браузер,
					ARIA-дублей ему нет. Ход — от 0 до `max`, шаг — оценки. Имя — из
					набора `aria`, там же `aria-valuetext` («4 из 5») и
					`aria-readonly` оценки только для показа: `readonly` поле не
					знает. Тема делает его прозрачным во всю ручку и не пускает к
					нему указатель: оценку ставит плагин, а не браузер.
				-->
				<input
					class="so-rating__input"
					type="range"
					min="0"
					:max="max"
					:step="step"
					:value="value"
					:id="id"
					:name="name"
					:disabled="disabled"
					v-bind="aria"
				/>
			</span>
		</span>
	</component>
</template>
