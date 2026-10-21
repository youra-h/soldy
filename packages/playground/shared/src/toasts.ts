/**
 * Образцы тостов стенда — одни на все хосты.
 *
 * Тосты приходят из кода, а не из разметки: кнопки превью Toasts показывают
 * их `show` — по кнопке на обычное сообщение и на каждый вид. Что сообщает
 * тост — данные, они общие. Своё содержимое (`render`, кнопка «Отменить») —
 * компонент фреймворка, данными он не станет: его к образцу добавляет хост
 * (`toastSample`).
 */

import type { IToastOptions, TToastsItemType } from '@soldy-ui/core'

/** Образец тоста: что он сообщает и есть ли у него своё содержимое — кнопка «Отменить». */
export type TToastSample = {
	/** Опции `show` без своего содержимого: текст есть у каждого образца. */
	readonly options: IToastOptions<never> & { readonly text: string }
	/** Своё содержимое — кнопка «Отменить», которой тост закрывается. */
	readonly undo: boolean
}

/**
 * Обычное сообщение — тост без вида: значок у него свой, нейтральный. Описание
 * — чтобы на белой плашке был виден и приглушённый текст, не только заголовок.
 */
export const TOAST_NORMAL: TToastSample = {
	options: { text: 'Черновик сохранён', description: 'Вернуться к нему можно из списка писем' },
	undo: true,
}

/**
 * Что сообщает тост каждого вида — чтобы значок читался рядом с текстом.
 * Срочный (`alert`) — ошибка, своё содержимое — у успеха и обычного: так на
 * странице видно и обе роли, и кнопку «Отменить».
 */
export const TOAST_SAMPLES = {
	info: {
		options: { text: 'Вышла новая версия', description: 'Обновится при следующем входе' },
		undo: false,
	},
	success: { options: { text: 'Письмо отправлено' }, undo: true },
	warning: {
		options: { text: 'Место почти закончилось', description: 'Свободно 200 МБ из 15 ГБ' },
		undo: false,
	},
	error: {
		options: { text: 'Нет сети', description: 'Изменения сохранятся позже', alert: true },
		undo: false,
	},
} satisfies Record<TToastsItemType, TToastSample>

/** Сколько «Сохраняем…» ждёт, прежде чем тот же тост сообщит итог, мс. */
export const TOAST_SAVING = 2000

/**
 * Опции `show` для тоста вида `type` (без вида — обычное сообщение): образец и
 * своё содержимое хоста — его кнопка «Отменить» (`undo`), — у тех образцов, где
 * оно есть.
 */
export function toastSample<TRender>(
	type: TToastsItemType | undefined,
	undo: TRender,
): IToastOptions<TRender> & { readonly text: string } {
	const sample = type ? TOAST_SAMPLES[type] : TOAST_NORMAL

	return sample.undo ? { ...sample.options, render: undo } : sample.options
}
