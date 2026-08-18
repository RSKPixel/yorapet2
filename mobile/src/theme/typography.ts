export const fonts = {
  sans: "IBMPlexSans_400Regular",
  sansMedium: "IBMPlexSans_500Medium",
  sansSemiBold: "IBMPlexSans_600SemiBold",
  sansBold: "IBMPlexSans_700Bold",
} as const;

export const typography = {
  brandHero: {
    fontFamily: fonts.sansBold,
    fontSize: 30,
    letterSpacing: -1.5,
    textTransform: "uppercase" as const,
    lineHeight: 34,
  },
  brand: {
    fontFamily: fonts.sansBold,
    fontSize: 21,
    letterSpacing: -0.8,
    textTransform: "uppercase" as const,
    lineHeight: 24,
  },
  body: {
    fontFamily: fonts.sans,
    fontSize: 15,
    lineHeight: 22,
  },
  label: {
    fontFamily: fonts.sansMedium,
    fontSize: 14,
    lineHeight: 19,
  },
  control: {
    fontFamily: fonts.sans,
    fontSize: 15,
    lineHeight: 20,
  },
  button: {
    fontFamily: fonts.sansMedium,
    fontSize: 14,
    lineHeight: 19,
  },
  title: {
    fontFamily: fonts.sansSemiBold,
    fontSize: 14,
    letterSpacing: 0.14,
    lineHeight: 19,
  },
  muted: {
    fontFamily: fonts.sans,
    fontSize: 13,
    lineHeight: 18,
  },
  pageTitle: {
    fontFamily: fonts.sansSemiBold,
    fontSize: 22,
    letterSpacing: -0.3,
    lineHeight: 28,
  },
} as const;
