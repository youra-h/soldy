export type TIconStylesPluginEvents = {
    /** Вызывается при изменении набора стилей иконки */
    'change:styles': (styles: Record<string, string | number>) => void
}
