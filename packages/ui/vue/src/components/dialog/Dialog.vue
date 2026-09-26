<script lang="ts">
import { Button } from '../button'
import { Icon } from '../icon'
import SetupDialog from './setup.component'

/**
 * `inheritAttrs: false` обязателен: корень шаблона — `<teleport>`, и Vue
 * считает корневым узлом именно его. Автоматический перенос атрибутов уходил
 * в телепорт и до окна не доезжал — ни `class`, ни `data-*`, ни события.
 * Поэтому переносим вручную, на панель: корень окна — она.
 */
export default { ...SetupDialog, inheritAttrs: false, components: { Button, Icon } }
</script>

<template>
	<teleport :to="target">
		<!--
			Окно телепортировано целиком: подложка и панель — соседи, а не
			обёртка и содержимое. Подложка стоит в DOM раньше панели: слой у
			них один (одно число `z-index` инлайном), и панель рисуется поверх
			просто порядком.

			Подложка обязательна и закрывает весь экран: фон под окном скрыт
			от скринридера, но не от указателя, и к странице его не пускает
			только она. Нажатие по ней для плагинов слоя — нажатие мимо корня.

			Открытость — `visible`: закрытое окно спрятано, а не размонтировано,
			и состояние содержимого переживает закрытие. Появление и
			исчезание — переход темы: `data-open` у панели и подложки говорит
			ей, проявляться или гаснуть.
		-->
		<template v-if="rendered">
			<!--
				Номер слоя у подложки тот же, что у окна: для окна под этим
				она — слой выше, и нажатие по ней его не закрывает. Открытость
				— тоже: подложка гаснет вместе с окном. Пометки владельцем у неё
				нет — для своего окна она мимо.
			-->
			<div
				class="s-dialog__backdrop"
				v-show="visible"
				:style="layout_backdropStyles"
				v-bind="backdropDataset"
			/>

			<!--
				Корень — сама панель: на ней слой (`data-layer`), пометка
				владельцем, место (`s-dialog--placement-*`), размер
				(`--dialog-width`, `--dialog-height`), `data-open` и
				`data-maximized`.
				Без пометки плагины не нашли бы слой окна, и нажатие в список
				Select внутри закрыло бы окно. `tabindex="-1"` — фокус встаёт
				на саму панель, когда внутри нечего фокусировать.

				Порядок в DOM — заголовок, тело, подвал, потом кнопки. В строку
				заголовка кнопки переносит тема, областями сетки. Поэтому фокус
				при открытии попадает на первый контрол содержимого, а не на
				«развернуть», а крестик остаётся последней остановкой Tab.
				Обёртки, которая собрала бы заголовок с кнопками, нет: она
				вернула бы кнопки в начало.
			-->
			<component
				ref="rootElement"
				:is="tag"
				v-show="visible"
				:class="classes"
				:style="layout_styles"
				tabindex="-1"
				v-bind="{ ...attrs, ...aria, ...dataset, ...dismiss_ownerAttribute, ...$attrs }"
			>
				<!--
					Заголовок рисуется всегда: на него окно ссылается
					`aria-labelledby`, и `id` для этой ссылки он берёт из
					`titleAria`. Вокруг слота нет пробелов: пустой заголовок
					тема сворачивает по `:empty`.
				-->
				<h2 class="s-dialog__title" v-bind="titleAria"><slot name="title" /></h2>

				<!--
					Тело — прокручивается оно, шапка и подвал остаются на месте.
					`id` — для `aria-describedby` предупреждения.
				-->
				<div class="s-dialog__body" v-bind="bodyAria">
					<slot />
				</div>

				<!-- Подвал — ряд действий. Пустой тема сворачивает по `:empty` -->
				<div class="s-dialog__footer"><slot name="footer" /></div>

				<!--
					Кнопка разворота — переключатель: имя одно, состояние в
					`aria-pressed`. Иконок две, видна одна — по состоянию окна,
					как отметка у CheckBox: «развернуть», пока окно не развёрнуто,
					и «вернуть размер» — когда развёрнуто.

					Кнопки шапки прячутся `rendered`, а не `visible`: тема
					опирается на их отсутствие в DOM. Вида и размера у них нет —
					кнопки красит тема по контексту.
				-->
				<Button
					embedded="dialog.maximize"
					class="s-dialog__maximize"
					:rendered="maximizable"
					@click="dialog.toggleMaximized()"
					v-bind="maximizeAria"
				>
					<slot v-if="maximized" name="restore-icon">
						<Icon embedded="dialog.restore-icon" :tag="restoreIconTag" />
					</slot>
					<slot v-else name="maximize-icon">
						<Icon embedded="dialog.maximize-icon" :tag="maximizeIconTag" />
					</slot>
				</Button>

				<!--
					Кнопка закрытия — в углу шапки со стороны конца строки. Она
					просит окно закрыться: отменить закрытие может подписчик
					`close:before`. Куда вернуть фокус, решает плагин фокуса.
				-->
				<Button
					embedded="dialog.close"
					class="s-dialog__close"
					:rendered="closable"
					@click="dialog.requestClose('button')"
					v-bind="closeAria"
				>
					<slot name="close-icon">
						<Icon embedded="dialog.close-icon" :tag="closeIconTag" />
					</slot>
				</Button>
			</component>
		</template>
	</teleport>
</template>
