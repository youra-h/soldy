export { shiftSize } from './utility/size'
export { frameDebounce } from './utility/frame-debounce'
export type {
	TThemeRegistry,
	IComponentVariants,
	TComponentVariant,
	TComponentSize,
	TValuePayload,
	TScrollBehavior,
	TConstructor,
} from './types'
export * from './attributes'
export * from './aria'
export * from './dataset'
export * from './event'
export * from './classes'
export * from './scale'
// Расчёт дат — внутренний: наружу только типы, которые называет API календаря
// и поля даты
export type { TCalendarDate, TWeekday, TDateUnit, TDatePart } from './calendar'
// Язык и словарь по умолчанию: от них отсчитывает приложение, когда задаёт свои
// (`useLocale`, `useTranslations` из `@soldy-ui/plugins`)
export * from './locale'
