<template>
	<!--
		Менеджер оборачивает приложение, как `LocaleProvider`: слот `default` —
		само приложение, своей разметки вокруг него нет. Потомок берёт API
		тостов (`useToasts()`) у лифта менеджера. Регион с тостами — второй
		узел корня, телепортом в `body` (цель — `target` слоя).
	-->
	<slot />

	<teleport to="body">
		<!--
			Регион стоит всегда, и пустым: живая область должна быть в документе
			до первого тоста. Места он не занимает и нажатий мимо тостов не
			ловит — это тема (`toasts/_toasts.scss`).

			Код выпустит на нём: место — модификатор `so-toasts--placement-*`
			(стоит всегда, умолчание `bottom-end`), номер слоя — `z-index`
			инлайном и `data-layer`, `role="region"` и имя из локали
			(«Уведомления (F8)»), `dir`.
		-->
		<section class="so-toasts">
			<ol class="so-toasts__list">
				<!--
					Тост — по одному на каждый показанный (`shown`), новый —
					первым: на экране он у края окна, а список растёт от края.
					Закрытый тост остаётся здесь, пока гаснет, и уходит из
					коллекции, когда доиграли переходы его корня.

					Слоты тоста пробрасываются целиком: `item-<слот>`, scope —
					scope слота тоста плюс сам тост. Значок отдаётся тосту, только
					когда `item-icon` задан менеджеру: без слота у тоста нет узла
					значка.
				-->
				<ToastsItem>
					<template #icon><slot name="item-icon" /></template>
					<template #default><slot name="item" /></template>
					<template #description><slot name="item-description" /></template>
					<template #content><slot name="item-content" /></template>
					<template #close-icon><slot name="item-close-icon" /></template>
				</ToastsItem>
			</ol>
		</section>
	</teleport>
</template>
