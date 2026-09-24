<script lang="ts">
import { Frame } from '../frame'
import SetupTooltip from './setup.component'

export default { ...SetupTooltip, components: { Frame } }
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
			Корень — обёртка триггера, якорь панели и цель наведения. Панель
			телепортирована, поэтому в корне лежит только триггер, и
			прямоугольник корня совпадает с его прямоугольником: курсор на
			триггере — курсор на корне. Рисуется по `tag`, по умолчанию `span`:
			подсказка встаёт и в строку текста, и в ряд кнопок.

			ARIA на корне нет: она у панели и у триггера.
		-->

		<!--
			Триггер — элемент потребителя. Фокус остаётся на нём и в панель не
			уходит. Своего экземпляра у содержимого слота нет, поэтому ссылку
			на панель — `aria-describedby` или, при `type="label"`,
			`aria-labelledby` — он получает через scope.
		-->
		<slot name="trigger" :triggerAria="triggerAria" />

		<!--
			Панель — Frame: телепорт, слой, привязка к корню — по умолчанию
			над триггером по центру, в 6 px от него — и пометка владельцем,
			по которой панель находят плагины. На неё ложится `aria` подсказки:
			`role="tooltip"` и `id`, на который ссылается триггер. Панель не
			фокусируется, кнопки закрытия в ней нет.

			Открытость — `visible` панели: закрытая спрятана, а не
			размонтирована, и ссылка триггера ведёт на неё всегда. Сторону у
			края окна выбирает `TAnchorPlugin` поверх `placement`.
		-->
		<Frame
			embedded="tooltip.frame"
			class="s-tooltip__panel"
			:visible="open"
			position="fixed"
			:anchor_anchor="rootElement"
			:anchor_placement="placement"
			:anchor_offset="6"
			v-bind="{ ...aria, ...dismiss_ownerAttribute }"
		>
			<!--
				Обёртка держит ширину панели: по тексту, до потолка темы,
				где бы у края окна панель ни стояла.
			-->
			<div class="s-tooltip__content">
				<slot />
			</div>
		</Frame>
	</component>
</template>
