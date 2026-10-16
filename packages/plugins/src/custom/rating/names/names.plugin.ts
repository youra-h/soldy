import type { IRating } from '@soldy-ui/core'
import { TNamesPlugin } from '../../../locale/names.plugin'
import type { IPluginContext } from '../../../base'
import type { ILocaleSource, TTranslations } from '../../../locale/types'

/**
 * Строка значения: шаблон из локали, на месте `{value}` — оценка, на месте
 * `{max}` — наибольшая. Порядок слов у каждого языка свой, поэтому места в
 * шаблоне, а не склейка.
 */
function valueText(template: string, value: string, max: string): string {
	return template.split('{value}').join(value).split('{max}').join(max)
}

/**
 * TRatingNamesPlugin — как звучит оценка: `aria-valuetext` поля от локали,
 * «4 из 5».
 *
 * Число поле объявило бы и само, но без наибольшей оценки скринридер не
 * скажет, много это или мало. Строка — шаблон локали (`rating.value`), числа
 * в ней — по тегу локали: «3,5 из 5», а не «3.5 из 5». Звёзд в строке нет:
 * значок оценки меняет слот.
 *
 * Пишет в `aria` владельца — набор поля — при установке, на смену локали, на
 * смену оценки и числа звёзд. Предпросмотр наведением строку не меняет:
 * скринридер объявляет значение, а не то, что под указателем.
 */
export class TRatingNamesPlugin extends TNamesPlugin<IRating> {
	/** Источник локали набора — за тегом для чисел: строки база отдаёт сама */
	private _locale: ILocaleSource | null = null

	override install(ctx: IPluginContext, options?: unknown): void {
		// До установки базы: первую запись база делает тем же вызовом
		this._locale = ctx.locale

		super.install(ctx, options)
	}

	override destroy(): void {
		this._locale = null

		super.destroy()
	}

	protected override _name(owner: IRating, translations: TTranslations): void {
		const tag = this._locale?.locale.tag

		owner.aria.add(
			'aria-valuetext',
			valueText(
				translations.rating.value,
				owner.value.toLocaleString(tag),
				owner.max.toLocaleString(tag),
			),
		)
	}

	protected override _watch(owner: IRating, name: () => void): void {
		this._listenTo(owner.events, 'change:value', name)
		this._listenTo(owner.events, 'change:max', name)
	}
}
