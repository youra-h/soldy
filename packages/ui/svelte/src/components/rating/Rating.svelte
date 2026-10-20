<script lang="ts">
	import { Dynamic, RoleIcon, roleIcon, toRootProps, toStyleText } from '../../adapter'
	import { setupRating } from './setup.component'
	import type { RatingProps } from './base.component'

	let { ref = $bindable(), ...props }: RatingProps = $props()
	const mountId = $props.id()

	const binding = setupRating(() => props, mountId, (node) => (ref = node))
	const state = binding.state

	// Значок без слота — иконка роли `star`: метка одна на роль (`roleIcon`)
	const STAR = roleIcon('star')
	const ICON = { class: 'so-rating__icon' }
</script>

<!--
	Rating — оценка звёздами: ползунок с одной ручкой (APG, Rating Slider).
	Значение — число на шкале от 0 до `max`, звёзды — его зрительная шкала.
	Корень рисуется по `tag`, по умолчанию `span`: оценку кладут в подпись
	`Label`, а внутри `label` HTML разрешает только строчную разметку. Поэтому
	и всё внутри — `span`.

	Размер, вариант и только чтение приходят классами корня (`--size-*`,
	`--variant-*`, `--readonly`), состояние — набором `dataset`
	(`data-disabled`), `dir` — в `attrs`. Обработчиков здесь нет: нажатие ловит
	плагин указателя на корне, наведение — плагин наведения там же, клавиши и
	жест скринридера — плагин клавиатуры на поле. Атрибуты потребителя — корню:
	указатель поле не ловит, и обработчик нажатия на нём не сработал бы
	никогда.

	Дорожка — ряд звёзд. Ячейки равные и встык, поэтому доля её коробки по оси
	— доля шкалы: точку указателя в значение переводят по дорожке, не зная о
	звёздах. Ручку и поле плагины находят по классам и только прямыми детьми,
	как у Slider: `__thumb` — ребёнок дорожки, `input` — ребёнок ручки.

	Звезда — по одной на единицу шкалы, под `aria-hidden`: значение объявляет
	поле. Доля заливки — в стиле звезды (`--so-rating-fraction`, число от 0 до
	1), от предпросмотра наведением, пока он идёт, иначе от значения; ядро
	отдаёт её значением, и стиль звезды — строкой. Слоёв два, оба — одна
	иконка: пустая звезда снизу и залитая сверху, в слое, обрезанном по доле.

	Иконка — `<svg>` роли `star` (`RoleIcon`), а не компонент Icon, как отметка
	CheckBox: иконок по две на звезду, а оценок в списке отзывов — десятки.
	Размер и цвет ей даёт тема по слою. Слот `icon` заменяет иконку в обоих
	слоях; какой слой он рисует, говорит `filled`, какую звезду — `value`.

	Ручка — невидимая, во весь ряд: в ней поле, и кольцо фокуса тема рисует на
	ней — вокруг всего ряда. Поле — нативное, как у Slider: мобильный
	скринридер двигает его своим жестом, `name`, `disabled` и отправку формы
	даёт браузер, ARIA-дублей ему нет. Ход — от 0 до `max`, шаг — оценки. Имя —
	из набора `aria`, там же `aria-valuetext` («4 из 5») и `aria-readonly`
	оценки только для показа: `readonly` поле не знает.
-->
{#snippet glyph(value: number, filled: boolean)}
	{#if props.icon}
		{@render props.icon({ value, filled })}
	{:else}
		<RoleIcon icon={STAR} attributes={ICON} />
	{/if}
{/snippet}

{#if state.rendered}
	<Dynamic
		tag={state.tag}
		attributes={toRootProps(state, [state.attrs, state.dataset], binding.forwardProps)}
		attach={binding.attachElement}
	>
		<span class="so-rating__track">
			{#each state.stars ?? [] as star (star.value)}
				<span class="so-rating__star" style={toStyleText(star.style)} aria-hidden="true">
					{@render glyph(star.value, false)}
					<span class="so-rating__star-fill">{@render glyph(star.value, true)}</span>
				</span>
			{/each}
			<span class="so-rating__thumb">
				<input
					class="so-rating__input"
					type="range"
					min="0"
					max={state.max}
					step={state.step}
					value={state.value}
					id={state.id}
					name={state.name}
					disabled={state.disabled}
					{...state.aria}
				/>
			</span>
		</span>
	</Dynamic>
{/if}
