<script lang="ts">
import { Icon } from '../../icon'
import { Button } from '../../button'
import { ProgressSpinner } from '../../progress-spinner'
import SetupToastsItem from './setup.component'

/**
 * Тост — внутренняя часть менеджера: его рисует только регион `Toasts`, по
 * одному на показанный элемент коллекции, и наружу пакета он не выходит.
 *
 * Атрибуты снаружи падают на корень сами: набор тоста (`aria`, `dataset`)
 * стоит на нём же, и разводить атрибуты по узлам незачем.
 */
export default { ...SetupToastsItem, components: { Icon, Button, ProgressSpinner } }
</script>

<template>
	<component
		ref="rootElement"
		:is="tag"
		v-if="rendered"
		v-show="visible"
		:class="classes"
		:style="{ '--so-toasts-depth': order }"
		v-bind="{ ...attrs, ...aria, ...dataset }"
	>
		<!--
			Корень — место тоста в списке: высота места, сдвиг жеста, уход и
			прозрачность (тема). На нём: вид сообщения — модификатор
			`so-toasts-item--type-*` (нет вида — обычное сообщение), `data-open`
			(с первой отрисовки; `false` — тост закрыт и гаснет), `data-swiping`
			(тянут), роль `status` или `alert` для срочного, `tabindex` — фокус по
			F8 и Escape на тосте под фокусом. Сдвиг во время жеста
			(`--so-swipe-offset`) плагин жеста пишет сюда сам. Глубина в стопке
			(`--so-toasts-depth`) — место тоста в составе, `order` фасада: в
			стопке передний — первый.

			Плашка — то, что видно: поверхность, кромка, тень и кольцо фокуса
			корня. Отдельный узел, а не корень: место растёт и схлопывается
			переходом высоты без замеров, а плашка своего размера не меняет.
		-->
		<div class="so-toasts-item__card">
			<!--
				Коробка значка стоит всегда, и в ней одно из трёх:
				- тост ждёт (`loading`) — бегущее кольцо, при любом виде и что бы ни
				  стояло в слоте. Размер и вариант кольцу разметка не передаёт:
				  диаметр и цвет даёт тема по месту — коробке значка;
				- задан слот `icon` (scope — вид) — свой значок;
				- иначе — значок вида по роли: `info`, `success`, `warning`,
				  `error`, у обычного сообщения — `notification`.
				Пустой слот уступает место значку вида, как пустые слоты-иконки у
				элементов коллекций. Коробка — декор: что случилось, говорит текст,
				поэтому она спрятана от скринридера вместе с ролью кольца.
			-->
			<span class="so-toasts-item__icon" aria-hidden="true">
				<ProgressSpinner v-if="loading" embedded="toasts.spinner" indeterminate />
				<slot v-else name="icon" :type="type">
					<Icon
						embedded="toasts.icon"
						:tag="type ? typeIconTags[type] : notificationIconTag"
					/>
				</slot>
			</span>

			<!--
				Текст: заголовок (слот `default`, запасное — `text` тоста),
				описание (`description` тоста) и своё содержимое (слот `content`,
				запасное — `render` тоста: кнопка «Отменить» и подобное, она
				получает тост пропом `toast` и может его закрыть). Пробелы с переносом
				строки вокруг слотов компилятор Vue убирает, и пустую часть тема
				сворачивает по `:empty`.
			-->
			<div class="so-toasts-item__body">
				<div class="so-toasts-item__text">
					<slot :text="text">{{ text }}</slot>
				</div>
				<div class="so-toasts-item__description">{{ description }}</div>
				<div class="so-toasts-item__content">
					<slot name="content"
						><component v-if="isToastRender(render)" :is="render" :toast="toast"
					/></slot>
				</div>
			</div>

			<!--
				The cross is last in the DOM: the last Tab stop in the toast. It
				is mounted only while `closable` (`v-if`). The name comes from the
				locale together with the toast text (`closeAria`). It has no view
				and no size: the theme gives the square and the `plain` look by
				context. The icon is the `close` role. `type="button"` — like
				every detail button: inside a form it does not submit it.
			-->
			<Button
				v-if="closable"
				embedded="toasts.close"
				type="button"
				class="so-toasts-item__close"
				@click="toast.close()"
				v-bind="closeAria"
			>
				<slot name="close-icon">
					<Icon embedded="toasts.close-icon" :tag="closeIconTag" />
				</slot>
			</Button>
		</div>
	</component>
</template>
