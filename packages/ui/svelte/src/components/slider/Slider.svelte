<script lang="ts">
	import { Dynamic, toRootProps, toStyleText } from '../../adapter'
	import { setupSlider } from './setup.component'
	import type { SliderProps } from './base.component'

	let { ref = $bindable(), ...props }: SliderProps = $props()
	const mountId = $props.id()

	const binding = setupSlider(() => props, mountId, (node) => (ref = node))
	const state = binding.state
</script>

<!--
	Slider — ползунок: ручки на рельсе, заливка и метки. Корень рисуется по
	`tag`, по умолчанию `span`: ползунок кладут в подпись `Label`, а внутри
	`label` HTML разрешает только строчную разметку. Поэтому и всё внутри —
	`span`.

	Ориентация, режим подсказки, размер и вариант приходят классами
	(`--horizontal` / `--vertical`, `--tooltip-*`, `--size-*`, `--variant-*`),
	состояния — набором `dataset` (`data-disabled`, `data-dragging`), `dir` — в
	`attrs`. Обработчиков здесь нет: нажатия и протяжку ловит плагин указателя
	на корне, клавиши и жест скринридера — плагин клавиатуры на полях.
	Атрибуты потребителя — корню: полей столько, сколько ручек.

	На корне — набор корня (`rootAria`): у нескольких ручек корень — группа
	полей с именем и описанием ползунка, от подписи поля формы `Field` тоже. У
	одной ручки набор пуст: имя и описание — у её поля.

	Ручки и метки — разметка, а не компоненты: потребитель их не адресует,
	число ручек задаёт значение, число меток — шкала. Всё, что в них зависит
	от значения, ядро отдаёт готовым: позиции — CSS-переменными в стиле,
	строкой (`toStyleText`): чужого на этих узлах нет, — состояния — наборами
	`data-*`.

	Дорожка — ход центров ручек: 0 % и 100 % значения — края её коробки по
	оси, её мерит плагин указателя. Рельс рисует тема псевдоэлементом, своего
	узла у него нет. Заливка — одна на ползунок: от начала или от `origin` до
	ручки, у нескольких ручек — между крайними.

	Метки — только если они заданы: точками шкалы или списком. Блок — под
	`aria-hidden`, как подсказка: подписи меток — зрительная шкала, значение и
	границы объявляет поле, а в подписи `Label` их текст вошёл бы в имя поля.
	Подпись — слот `mark` со scope метки, по умолчанию — её `label`. Пробелы
	по краям подписи Svelte срезает сам: пустую подпись тема прячет по
	`:empty`, и метка остаётся одной точкой.

	Ручка — по одной на значение: позиция в стиле (`--so-slider-position`),
	состояние `data-dragging`. Петля по месту ручки, как ключ по индексу у
	Vue: число ручек задаёт значение, своей идентичности у ручки нет.
	Подсказка со значением — внутри ручки, поэтому едет за ней сама.

	Нативное поле — по одному в ручке. Мобильные скринридеры двигают его своим
	жестом, `name`, `disabled` и отправку формы даёт браузер, ARIA-дублей ему
	нет. Ход поля — соседи и зазор, шаг — шкалы (`any` у списка). Набор поля
	ядро отдаёт целиком (`thumb.aria`): у одной ручки — весь `aria` ползунка, у
	нескольких — ориентация и ошибка, а имя и описание — у корня-группы; имя
	ручки из `thumbLabels` в нём уже сильнее.

	Подсказка — только когда она включена (`tooltip`): рисовать ли, решает ядро
	(`tooltipRendered`), когда показывать в `auto` — тема. Под `aria-hidden`.
	Содержимое — слот `thumb` со scope ручки, по умолчанию — её значение, без
	пробелов по краям, как у подписи метки.
-->
{#if state.rendered}
	<Dynamic
		tag={state.tag}
		attributes={toRootProps(
			state,
			[state.attrs, state.rootAria, state.dataset],
			binding.forwardProps,
		)}
		attach={binding.attachElement}
	>
		<span class="so-slider__track">
			<span class="so-slider__range" style={toStyleText(state.rangeStyle)}></span>
			{#if state.shownMarks && state.shownMarks.length > 0}
				<span class="so-slider__marks" aria-hidden="true">
					{#each state.shownMarks as mark, index (index)}
						<span class="so-slider__mark" style={toStyleText(mark.style)} {...mark.dataset}>
							<span class="so-slider__mark-label">
								{#if props.mark}
									{@render props.mark({ value: mark.value, label: mark.label })}
								{:else}
									{mark.label}
								{/if}
							</span>
						</span>
					{/each}
				</span>
			{/if}
			{#each state.thumbs ?? [] as thumb, index}
				<span class="so-slider__thumb" style={toStyleText(thumb.style)} {...thumb.dataset}>
					<input
						class="so-slider__input"
						type="range"
						min={thumb.min}
						max={thumb.max}
						step={thumb.step}
						value={thumb.value}
						name={state.name}
						disabled={state.disabled}
						{...thumb.aria}
					/>
					{#if state.tooltipRendered}
						<span class="so-slider__tooltip" aria-hidden="true">
							{#if props.thumb}
								{@render props.thumb({ value: thumb.value, index })}
							{:else}
								{thumb.value}
							{/if}
						</span>
					{/if}
				</span>
			{/each}
		</span>
	</Dynamic>
{/if}
