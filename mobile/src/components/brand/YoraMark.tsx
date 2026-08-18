import Svg, {
  Circle,
  Defs,
  LinearGradient,
  Path,
  Rect,
  Stop,
} from "react-native-svg";

type YoraMarkProps = {
  size?: number;
  title?: string;
};

/** Geometric Y mark — same language as frontend YoraMark. */
export function YoraMark({ size = 36, title = "YORA PET" }: YoraMarkProps) {
  const bgId = "yp-bg";
  const markId = "yp-mark";

  return (
    <Svg
      width={size}
      height={size}
      viewBox="0 0 64 64"
      accessibilityLabel={title}
    >
      <Defs>
        <LinearGradient id={bgId} x1="10" y1="6" x2="54" y2="58">
          <Stop offset="0" stopColor="#0e0f12" />
          <Stop offset="1" stopColor="#3d2e16" />
        </LinearGradient>
        <LinearGradient id={markId} x1="18" y1="16" x2="46" y2="48">
          <Stop offset="0" stopColor="#e0b878" />
          <Stop offset="1" stopColor="#d4a35c" />
        </LinearGradient>
      </Defs>
      <Rect width="64" height="64" rx="16" fill={`url(#${bgId})`} />
      <Rect
        x="1.25"
        y="1.25"
        width="61.5"
        height="61.5"
        rx="14.75"
        stroke="#d4a35c"
        strokeOpacity={0.32}
        fill="none"
      />
      <Circle cx="32" cy="32" r="21" fill="#d4a35c" fillOpacity={0.1} />
      <Path
        d="M20 19 L32 37 L44 19"
        stroke={`url(#${markId})`}
        strokeWidth={4.25}
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />
      <Path
        d="M32 37 V47"
        stroke={`url(#${markId})`}
        strokeWidth={4.25}
        strokeLinecap="round"
        fill="none"
      />
      <Circle cx="20" cy="19" r="3.25" fill="#e0b878" />
      <Circle cx="44" cy="19" r="3.25" fill="#e0b878" />
      <Circle cx="32" cy="47" r="3.75" fill="#e8c992" />
    </Svg>
  );
}
