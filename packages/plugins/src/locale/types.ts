import type { IListenable } from '../base/types'

/**
 * Строки, которые библиотека рисует сама: имена кнопок без текста — закрытия,
 * разворота, листания, очистки, — и полей, которым подпись неоткуда взять.
 *
 * Разделы — по компоненту, который читает строку. Имён, которые знает только
 * приложение (подпись поля, имя индикатора выполнения), здесь нет: их задают
 * пропсы компонента (`aria_label`, `thumbLabels`).
 *
 * Строки — шаблоны, а не функции: локаль — данные, и её грузят из JSON.
 * Строка с именем части (`tabs.close`, `tags.close`, `field.clear`) несёт
 * место для имени — `{name}`: порядок слов у каждого языка свой, и склейка
 * «слово + имя» навязала бы всем один (`formatName`).
 */
export type TTranslations = {
	/** Модальный слой — окно и выезжающая панель */
	readonly modal: {
		/** Имя кнопки закрытия */
		readonly close: string
	}
	/** Модальное окно */
	readonly dialog: {
		/** Имя кнопки разворота — одно на оба состояния: состояние сообщает `aria-pressed` */
		readonly maximize: string
	}
	/** Поповер */
	readonly popover: {
		/** Имя кнопки закрытия */
		readonly close: string
	}
	/** Табы */
	readonly tabs: {
		/** Имя кнопки закрытия таба — шаблон с текстом таба на месте `{name}` */
		readonly close: string
	}
	/** Теги */
	readonly tags: {
		/** Имя кнопки закрытия тега — шаблон с текстом тега на месте `{name}` */
		readonly close: string
		/** Имя кнопки «…» — той, что открывает панель с непоместившимися тегами */
		readonly more: string
	}
	/** Лента с кнопками листания */
	readonly scroller: {
		/** Имя кнопки «назад» */
		readonly prev: string
		/** Имя кнопки «вперёд» */
		readonly next: string
	}
	/** Поле ввода — текстовое и поле даты */
	readonly field: {
		/** Имя кнопки очистки — шаблон с именем поля на месте `{name}` */
		readonly clear: string
	}
	/** Таблица */
	readonly table: {
		/** Имя чекбокса «выбрать все» в шапке колонки выбора */
		readonly selectAll: string
	}
	/** Календарь */
	readonly calendar: {
		/** Имя кнопки «предыдущий месяц» */
		readonly prevMonth: string
		/** Имя кнопки «следующий месяц» */
		readonly nextMonth: string
		/** Имя стрелки панели выбора месяца и года «предыдущий год» — на уровне месяцев */
		readonly prevYear: string
		/** Имя стрелки «следующий год» — на уровне месяцев */
		readonly nextYear: string
		/** Имя стрелки «предыдущие 12 лет» — на уровне лет */
		readonly prevYears: string
		/** Имя стрелки «следующие 12 лет» — на уровне лет */
		readonly nextYears: string
	}
	/** Поле даты с календарём в панели */
	readonly datePicker: {
		/** Имя кнопки календаря — оно же имя панели, которую кнопка открывает */
		readonly trigger: string
		/** Имя поля начала диапазона */
		readonly start: string
		/** Имя поля конца диапазона */
		readonly end: string
	}
}

/**
 * Локаль — язык и строки библиотеки одним значением.
 *
 * `tag` — тег BCP 47 для Intl: подписи дат, первый день недели, формат поля
 * даты, сравнение строк при сортировке таблицы. `translations` — строки,
 * которые библиотека рисует сама. Одно значение, а не два: язык без строк
 * давал бы китайские даты рядом с английскими кнопками.
 *
 * Готовые — шесть языков ООН (`enUS`, `ruRU`, `zhCN`, `frFR`, `esES`,
 * `arEG`); любую другую приложение пишет само или собирает поверх готовой
 * (`extendLocale`).
 */
export type TLocale = {
	readonly tag: string
	readonly translations: TTranslations
}

/** Часть строк: любые разделы, в разделе — любые строки. */
export type TPartialTranslations = {
	readonly [K in keyof TTranslations]?: Partial<TTranslations[K]>
}

/** Правка локали для `extendLocale`: свой тег, свои строки — что задано. */
export type TLocalePatch = {
	readonly tag?: string
	readonly translations?: TPartialTranslations
}

/** События источника локали. */
export type TLocaleSourceEvents = {
	/** change — локаль сменилась: новая уже в `locale` */
	change: (locale: TLocale) => void
}

/**
 * Источник локали монтирования — то, что плагин видит в контексте
 * (`IPluginContext.locale`): текущая локаль и её смена.
 *
 * Только чтение: локаль задаёт тот, кто источник создал, — провайдер адаптера
 * для своего поддерева. Плагин читает её при установке и подписывается на
 * смену.
 */
export interface ILocaleSource {
	readonly locale: TLocale
	readonly events: IListenable<TLocaleSourceEvents>
}

/**
 * Что плагину языка нужно от владельца: свойство `locale`.
 *
 * Структурный тип, а не класс: плагин стоит на календаре, поле даты,
 * DatePicker и таблице, а общего у них только это свойство.
 */
export interface ILocaleOwner {
	locale: string
}
