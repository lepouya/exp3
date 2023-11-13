import { PropsWithChildren } from "react";

export type IconProps = {
  icon: string;
  pack?: string;

  color?: string;
  size?: string;
  position?: "top-left" | "top-right" | "bottom-left" | "bottom-right";

  className?: string;
  style?: React.CSSProperties;
};

export default function Icon(props: PropsWithChildren<IconProps>) {
  if (props.icon.includes(";")) {
    const [mainIcon, ...badgeIcons] = props.icon.split(";");
    props = {
      ...props,
      icon: mainIcon,
      children: (
        <>
          {badgeIcons.map((badgeIcon, idx) => (
            <IconBadge key={`badge-${idx}`} icon={badgeIcon} />
          ))}
          {props.children}
        </>
      ),
    };
  }

  return (
    <div className="icon-wrapper">
      {genIconSVG(props)}
      {props.children}
    </div>
  );
}

export function IconBadge(props: IconProps) {
  return genIconSVG(props, "icon-badge");
}

function genIconSVG(
  { icon, pack, color, size, position, className, style }: IconProps,
  badgeClass = "",
) {
  const parts = icon
    .split(/\s+/)
    .filter((s) => s.trim().length > 0)
    .filter((s) => (s.includes(":") ? !([pack, icon] = s.split(":", 2)) : true))
    .filter((s) => (/^#[0-9a-f]+$/i.test(s) ? !(color = s) : true))
    .filter((s) => (/^[-.0-9]+(%|px|em|vh|vw)$/i.test(s) ? !(size = s) : true))
    .filter((s) =>
      s === "top-left" ||
      s === "top-right" ||
      s === "bottom-left" ||
      s === "bottom-right"
        ? !(position = s)
        : true,
    );

  icon = parts.pop() || icon;
  color = parts.pop() || color;
  size = parts.pop() || size;
  position = position || (badgeClass ? "top-right" : undefined);
  className = [
    "icon",
    pack && `icon-${pack}`,
    icon && `icon-${icon}`,
    position && `icon-${position}`,
    color && !color.startsWith("#") && color,
    className,
    badgeClass,
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <svg
      className={className}
      width={size}
      height={size}
      color={color?.startsWith("#") ? color : undefined}
      style={style}
    >
      <use href={`${pack ? `sprites/${pack}.svg` : ""}#${icon}`} />
    </svg>
  );
}
