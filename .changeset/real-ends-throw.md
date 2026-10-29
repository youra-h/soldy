---
'@soldy-ui/angular': minor
---

Angular: outputs shared by every visual component (the events of `ComponentViewDescriptor` — `soShow`, `soChangeVisible` and the rest) are declared once, by the new abstract directive `TViewSurface` that every visual `T<Name>Surface` extends. `<Name>OutputNames` of a visual component now lists only its own outputs; the full list is `[...ViewOutputNames, ...<Name>OutputNames]`. Template bindings and output types do not change.
