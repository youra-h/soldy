<script lang="ts">
import { Frame } from '../frame'
import { Button } from '../button'
import { Icon } from '../icon'
import SetupPopover from './setup.component'

export default { ...SetupPopover, components: { Frame, Button, Icon } }
</script>

<template>
	<!--
		Корень — обёртка триггера и якорь панели. Рисуется по `tag`, по
		умолчанию `span`: Popover встаёт и в строку текста, и в ряд тегов, а
		внутри строчного элемента HTML разрешает только строчную разметку.
		Панель телепортирована, поэтому в корне лежит только триггер, и
		прямоугольник корня совпадает с его прямоугольником.

		`data-open` — на корне, для темы и для потребителя, который красит свой
		триггер по контексту. ARIA на корне нет: она у панели и у триггера.
	-->
	<component
		ref="rootElement"
		:is="tag"
		v-if="rendered"
		v-show="visible"
		:class="classes"
		v-bind="{ ...attrs, ...dataset }"
	>
		<!--
			Триггер — содержимое потребителя, например кнопка «…» у Tags. Лежит
			внутри корня, поэтому нажатие по открытому триггеру — нажатие
			внутри владельца, и панель не мигает. Своего экземпляра у
			содержимого слота нет, поэтому сторону связки (`aria-haspopup`,
			`aria-expanded`, `aria-controls`) и вид «нажат» (`data-selected`)
			он получает через scope — двумя наборами, ARIA и `data-*` врозь.
		-->
		<slot name="trigger" :triggerAria="triggerAria" :triggerDataset="triggerDataset" />

		<!--
			Панель — Frame: телепорт, слой, привязка к корню, пометка
			владельцем. На неё ложится `aria` поповера: `role="dialog"`, `id`,
			на который ссылается `aria-controls` триггера, и имя от
			`TAriaPlugin`. `tabindex="-1"` — фокус встаёт на саму панель, когда
			внутри нечего фокусировать.

			Открытость — это `visible` панели, а не `rendered`: закрытие её
			прячет, а не размонтирует. Сторону у края окна выбирает
			`TAnchorPlugin` поверх `placement`.
		-->
		<Frame
			embedded="popover.frame"
			class="s-popover__panel"
			tabindex="-1"
			:visible="open"
			position="fixed"
			:anchor_anchor="rootElement"
			:anchor_placement="placement"
			:anchor_offset="8"
			v-bind="{ ...aria, ...dismiss_ownerAttribute }"
		>
			<!--
				Содержимое в DOM раньше кнопки закрытия — в том же порядке, в
				каком читается верхний ряд панели: текст от начала строки,
				крестик в её конце. Поэтому фокус при открытии встаёт на первый
				фокусируемый элемент содержимого, а крестик — последняя
				остановка Tab в панели.

				`lazyMount` действует только на слот: обёртка остаётся, панель
				не размонтируется никогда.
			-->
			<div class="s-popover__content">
				<slot v-if="contentRendered" />
			</div>

			<!--
				Кнопка закрытия — в верхнем углу со стороны конца строки. Вида
				у неё нет: значения вида объявляет тема, и красит кнопку она по
				контексту (`.s-popover__close`). `size` не передаётся: тема
				держит квадрат по размеру Button.

				Кнопка только закрывает поповер. Куда вернуть фокус, решает
				плагин фокуса.
			-->
			<Button
				embedded="popover.close"
				class="s-popover__close"
				:rendered="closable"
				@click="popover.open = false"
				v-bind="closeAria"
			>
				<slot name="close-icon">
					<Icon embedded="popover.close-icon" :tag="closeIconTag" />
				</slot>
			</Button>
		</Frame>
	</component>
</template>
