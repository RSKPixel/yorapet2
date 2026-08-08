/** CSS root class for the shared form shell. */
export const DEFAULT_WIN_FORM_CLASS = "default-win-form";

export const defaultWinForm = {
  root: DEFAULT_WIN_FORM_CLASS,
  host: "default-win-form-host",
  header: "default-win-form__header",
  title: "default-win-form__title",
  titleIcon: "default-win-form__title-icon",
  subtitle: "default-win-form__subtitle",
  body: "default-win-form__body",
  footer: "default-win-form__footer",
  field: "default-win-form__field",
  label: "default-win-form__label",
  control: "default-win-form__control",
  error: "default-win-form__error",
  button: "default-win-form__button",
  buttonPrimary: "default-win-form__button default-win-form__button--primary",
} as const;
