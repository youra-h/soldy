/**
 * @license
 * The placeholders of empty date parts by language are React Spectrum data:
 * packages/react-stately/src/datepicker/placeholders.ts of
 * https://github.com/adobe/react-spectrum at commit d0110f7 — based on the
 * strings of `<input type="date">` in Chrome and Firefox. Copyright 2020 Adobe.
 * Licensed under the Apache License, Version 2.0. The license text ships with
 * this package as LICENSE-Apache-2.0.
 *
 * Changes to the source: only the table of the year, month and day
 * placeholders is kept, as a plain object keyed by language tag; the
 * dictionary class around it, the placeholders of other fields and the lookup
 * are not taken.
 */

import type { TDatePart } from './types'

/**
 * Подсказки пустых частей поля даты по тегу языка — тексты поля
 * `<input type="date">` браузеров. Языка нет в таблице — английские (`en`).
 *
 * Таблица, а не Intl: подсказок частей даты у Intl нет. Данные чужие — под
 * Apache-2.0, поэтому шапка `@license` выше и `LICENSE-Apache-2.0` рядом с
 * манифестом пакета (AGENTS.md, «Даты»).
 */
export const DATE_PART_PLACEHOLDERS: Readonly<Record<string, Readonly<Record<TDatePart, string>>>> =
	{
		ach: { year: 'mwaka', month: 'dwe', day: 'nino' },
		af: { year: 'jjjj', month: 'mm', day: 'dd' },
		am: { year: 'ዓዓዓዓ', month: 'ሚሜ', day: 'ቀቀ' },
		an: { year: 'aaaa', month: 'mm', day: 'dd' },
		ar: { year: 'سنة', month: 'شهر', day: 'يوم' },
		ast: { year: 'aaaa', month: 'mm', day: 'dd' },
		az: { year: 'iiii', month: 'aa', day: 'gg' },
		be: { year: 'гггг', month: 'мм', day: 'дд' },
		bg: { year: 'гггг', month: 'мм', day: 'дд' },
		bn: { year: 'yyyy', month: 'মিমি', day: 'dd' },
		br: { year: 'bbbb', month: 'mm', day: 'dd' },
		bs: { year: 'gggg', month: 'mm', day: 'dd' },
		ca: { year: 'aaaa', month: 'mm', day: 'dd' },
		cak: { year: 'jjjj', month: 'ii', day: "q'q'" },
		ckb: { year: 'ساڵ', month: 'مانگ', day: 'ڕۆژ' },
		cs: { year: 'rrrr', month: 'mm', day: 'dd' },
		cy: { year: 'bbbb', month: 'mm', day: 'dd' },
		da: { year: 'åååå', month: 'mm', day: 'dd' },
		de: { year: 'jjjj', month: 'mm', day: 'tt' },
		dsb: { year: 'llll', month: 'mm', day: 'źź' },
		el: { year: 'εεεε', month: 'μμ', day: 'ηη' },
		en: { year: 'yyyy', month: 'mm', day: 'dd' },
		eo: { year: 'jjjj', month: 'mm', day: 'tt' },
		es: { year: 'aaaa', month: 'mm', day: 'dd' },
		et: { year: 'aaaa', month: 'kk', day: 'pp' },
		eu: { year: 'uuuu', month: 'hh', day: 'ee' },
		fa: { year: 'سال', month: 'ماه', day: 'روز' },
		ff: { year: 'hhhh', month: 'll', day: 'ññ' },
		fi: { year: 'vvvv', month: 'kk', day: 'pp' },
		fr: { year: 'aaaa', month: 'mm', day: 'jj' },
		fy: { year: 'jjjj', month: 'mm', day: 'dd' },
		ga: { year: 'bbbb', month: 'mm', day: 'll' },
		gd: { year: 'bbbb', month: 'mm', day: 'll' },
		gl: { year: 'aaaa', month: 'mm', day: 'dd' },
		he: { year: 'שנה', month: 'חודש', day: 'יום' },
		hr: { year: 'gggg', month: 'mm', day: 'dd' },
		hsb: { year: 'llll', month: 'mm', day: 'dd' },
		hu: { year: 'éééé', month: 'hh', day: 'nn' },
		ia: { year: 'aaaa', month: 'mm', day: 'dd' },
		id: { year: 'tttt', month: 'bb', day: 'hh' },
		is: { year: 'áááá', month: 'mm', day: 'dd' },
		it: { year: 'aaaa', month: 'mm', day: 'gg' },
		ja: { year: '年', month: '月', day: '日' },
		ka: { year: 'წწწწ', month: 'თთ', day: 'რრ' },
		kk: { year: 'жжжж', month: 'аа', day: 'кк' },
		kn: { year: 'ವವವವ', month: 'ಮಿಮೀ', day: 'ದಿದಿ' },
		ko: { year: '연도', month: '월', day: '일' },
		lb: { year: 'jjjj', month: 'mm', day: 'dd' },
		lo: { year: 'ປປປປ', month: 'ດດ', day: 'ວວ' },
		lt: { year: 'mmmm', month: 'mm', day: 'dd' },
		lv: { year: 'gggg', month: 'mm', day: 'dd' },
		meh: { year: 'aaaa', month: 'mm', day: 'dd' },
		ml: { year: 'വർഷം', month: 'മാസം', day: 'തീയതി' },
		ms: { year: 'tttt', month: 'mm', day: 'hh' },
		nb: { year: 'åååå', month: 'mm', day: 'dd' },
		nl: { year: 'jjjj', month: 'mm', day: 'dd' },
		nn: { year: 'åååå', month: 'mm', day: 'dd' },
		no: { year: 'åååå', month: 'mm', day: 'dd' },
		oc: { year: 'aaaa', month: 'mm', day: 'jj' },
		pl: { year: 'rrrr', month: 'mm', day: 'dd' },
		pt: { year: 'aaaa', month: 'mm', day: 'dd' },
		rm: { year: 'oooo', month: 'mm', day: 'dd' },
		ro: { year: 'aaaa', month: 'll', day: 'zz' },
		ru: { year: 'гггг', month: 'мм', day: 'дд' },
		sc: { year: 'aaaa', month: 'mm', day: 'dd' },
		scn: { year: 'aaaa', month: 'mm', day: 'jj' },
		sk: { year: 'rrrr', month: 'mm', day: 'dd' },
		sl: { year: 'llll', month: 'mm', day: 'dd' },
		sr: { year: 'гггг', month: 'мм', day: 'дд' },
		'sr-Latn': { year: 'gggg', month: 'mm', day: 'dd' },
		sv: { year: 'åååå', month: 'mm', day: 'dd' },
		szl: { year: 'rrrr', month: 'mm', day: 'dd' },
		tg: { year: 'сссс', month: 'мм', day: 'рр' },
		th: { year: 'ปปปป', month: 'ดด', day: 'วว' },
		tr: { year: 'yyyy', month: 'aa', day: 'gg' },
		uk: { year: 'рррр', month: 'мм', day: 'дд' },
		'zh-CN': { year: '年', month: '月', day: '日' },
		'zh-TW': { year: '年', month: '月', day: '日' },
	}
