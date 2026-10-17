<script lang="ts">
import { ToastsItem } from './item'
import SetupToasts from './setup.component'

/**
 * `inheritAttrs: false` обязателен: корень шаблона — фрагмент из приложения
 * в слоте и телепорта. Автоматического переноса атрибутов у фрагмента нет
 * вовсе, а перенос в слот или телепорт ушёл бы не туда. Поэтому переносим
 * вручную, на регион: корень менеджера — он.
 */
export default { ...SetupToasts, inheritAttrs: false, components: { ToastsItem } }
</script>

<template>
	<!--
		Менеджер оборачивает приложение, как `LocaleProvider`: слот `default` —
		само приложение, своей разметки вокруг него нет. Потомок берёт API
		тостов (`useToasts()`) у лифта менеджера. Регион с тостами — второй
		узел корня, телепортом в цель слоя (`target`). Слот стоит вне условия
		региона: приложение рисуется и без региона.
	-->
	<slot />

	<teleport :to="target">
		<!--
			Регион стоит всегда, и пустым: живая область должна быть в документе
			до первого тоста. Места он не занимает и нажатий мимо тостов не
			ловит — это тема (`toasts/_toasts.scss`).

			На нём: место — модификатор `so-toasts--placement-*` и раскладка —
			`so-toasts--layout-*` (оба стоят всегда), номер слоя — `z-index`
			(`layout_styles`) и `data-layer`, `role="region"`, `aria-live` и имя
			из локали («Уведомления (F8)»), `dir`. Атрибуты потребителя — поверх
			наборов. Колесо и стрелки стопки слушает на нём плагин стопки.
		-->
		<component
			ref="rootElement"
			:is="tag"
			v-if="rendered"
			v-show="visible"
			:class="classes"
			:style="layout_styles"
			v-bind="{ ...attrs, ...aria, ...dataset, ...$attrs }"
		>
			<ol class="so-toasts__list">
				<!--
					Тост — по одному на каждый показанный (`shown`), новый —
					первым: на экране он у края окна, а список растёт от края.
					Закрытый тост остаётся здесь, пока гаснет, и уходит из
					коллекции, когда доиграли переходы его корня.

					Слоты тоста пробрасываются целиком: `item-<слот>`, scope —
					scope слота тоста плюс сам тост. Значок и иконка крестика
					отдаются тосту, только когда заданы менеджеру, как слоты-иконки
					элементов у остальных коллекций: без слота тост рисует свои —
					значок вида и иконку крестика. Текст и своё содержимое
					пробрасываются всегда. Пустой проброс тост заменяет своим —
					значком вида, текстом и `render`.
				-->
				<ToastsItem v-for="item in shown" :key="item.uid" :ctrl="item">
					<template v-if="$slots['item-icon']" #icon="{ type }">
						<slot name="item-icon" :item="item" :type="type" />
					</template>
					<template #default="{ text }">
						<slot name="item" :item="item" :text="text" />
					</template>
					<template #content>
						<slot name="item-content" :item="item" />
					</template>
					<template v-if="$slots['item-close-icon']" #close-icon>
						<slot name="item-close-icon" :item="item" />
					</template>
				</ToastsItem>
			</ol>
		</component>
	</teleport>
</template>
