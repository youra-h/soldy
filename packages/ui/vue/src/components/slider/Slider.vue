<script lang="ts">
import SetupSlider from './setup.component'

export default { ...SetupSlider }
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
			Ползунок: ручки на рельсе, заливка и метки. Корень рисуется по `tag`,
			по умолчанию `span`: ползунок кладут в подпись `Label`, а внутри
			`label` HTML разрешает только строчную разметку. Поэтому и всё
			внутри — `span`.

			Ориентация, режим подсказки, размер и вариант приходят классами
			(`--horizontal` / `--vertical`, `--tooltip-*`, `--size-*`,
			`--variant-*`), состояния — набором `dataset` (`data-disabled`,
			`data-dragging`), `dir` — в `attrs`.
			Обработчиков здесь нет: нажатия и протяжку ловит плагин указателя на
			корне, клавиши и жест скринридера — плагин клавиатуры на полях.

			Ручки и метки — разметка, а не компоненты: потребитель их не
			адресует, число ручек задаёт значение, число меток — шкала. Всё, что
			в них зависит от значения, ядро отдаёт готовым: позиции —
			CSS-переменными в `style`, состояния — наборами `data-*`.
		-->

		<!--
			Дорожка — ход центров ручек: 0 % и 100 % значения — края её коробки
			по оси, её мерит плагин указателя. Рельс рисует тема псевдоэлементом,
			своего узла у него нет.
		-->
		<span class="s-slider__track">
			<!--
				Заливка — одна на ползунок: от начала или от `origin` до ручки, у
				нескольких ручек — между крайними. Края приходят переменными
				(`--s-slider-range-start`, `--s-slider-range-end`).
			-->
			<span class="s-slider__range" :style="rangeStyle"></span>

			<!--
				Метки — только если они заданы: точками шкалы или списком. Каждая
				метка — позиция в `style` (`--s-slider-position`) и состояния
				`data-in-range` и `data-current`. Блок — под `aria-hidden`, как
				подсказка: подписи меток — зрительная шкала, значение и границы
				объявляет поле, а в подписи `Label` их текст вошёл бы в имя поля.
			-->
			<span v-if="shownMarks.length > 0" class="s-slider__marks" aria-hidden="true">
				<span
					v-for="(mark, index) in shownMarks"
					:key="index"
					class="s-slider__mark"
					:style="mark.style"
					v-bind="mark.dataset"
				>
					<!--
						Подпись — слот `mark` со scope метки, по умолчанию — её
						`label`. Вокруг слота и запасной подписи нет пробелов:
						пустую подпись тема прячет по `:empty`, и метка остаётся
						одной точкой.
					-->
					<span class="s-slider__mark-label"
						><slot name="mark" :value="mark.value" :label="mark.label">{{
							mark.label
						}}</slot></span
					>
				</span>
			</span>

			<!--
				Ручка — по одной на значение: позиция в `style`
				(`--s-slider-position`), состояние `data-dragging`. Подсказка со
				значением — внутри ручки, поэтому едет за ней сама.
			-->
			<span
				v-for="(thumb, index) in thumbs"
				:key="index"
				class="s-slider__thumb"
				:style="thumb.style"
				v-bind="thumb.dataset"
			>
				<!--
					Нативное поле — по одному в ручке. Мобильные скринридеры
					двигают его своим жестом, `name`, `disabled` и отправку формы
					даёт браузер, ARIA-дублей ему нет. Ход поля — соседи и зазор,
					шаг — шкалы (`any` у списка). Имя и ориентация — из общего
					набора `aria`, имя ручки из `thumbLabels` сильнее. Тема делает
					поле прозрачным во всю ручку и не пускает к нему указатель:
					тянет плагин, а не браузер.
				-->
				<input
					class="s-slider__input"
					type="range"
					:min="thumb.min"
					:max="thumb.max"
					:step="thumb.step"
					:value="thumb.value"
					:name="name"
					:disabled="disabled"
					v-bind="{ ...aria, ...thumb.aria }"
				/>
				<!--
					Подсказка со значением — только когда она включена
					(`tooltip`): рисовать ли, решает ядро (`tooltipRendered`),
					когда показывать в `auto` — тема. Под `aria-hidden`: значение
					объявляет поле, а в подписи `Label` текст подсказки вошёл бы в
					имя поля. Содержимое — слот `thumb` со scope ручки, по
					умолчанию — её значение. Вокруг слота и запасного текста нет
					пробелов, как у подписи метки: в тексте подсказки остались бы
					пробелы по краям.
				-->
				<span v-if="tooltipRendered" class="s-slider__tooltip" aria-hidden="true"
					><slot name="thumb" :value="thumb.value" :index="index">{{
						thumb.value
					}}</slot></span
				>
			</span>
		</span>
	</component>
</template>
