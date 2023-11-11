import React, { useEffect, useState } from "react";

import composeImage, { ImageProps } from "../utils/composeImage";

type ImageCompositionProps = {
  sources?: (ImageProps | string)[];
  format?: string;
  quality?: number;

  width?: number;
  height?: number;

  style?: Record<string, string>;
  className?: string | string[];

  loadingImage?: ImageProps | string;
  errorImage?: ImageProps | string;
};

export default function ImageComposition(props: ImageCompositionProps) {
  const [data, setData] = useState("");
  const serializedProps = JSON.stringify(props);

  useEffect(() => {
    const fetchData = async () => {
      if (props.loadingImage) {
        try {
          setData(
            (await composeImage([], {
              ...props,
              sources: [props.loadingImage],
            })) as string,
          );
        } catch {
          setData("error");
        }
      }

      if (props.sources?.length) {
        try {
          setData((await composeImage([], props)) as string);
        } catch (e) {
          setData("error");
        }
      }

      if (data === "error" && props.errorImage) {
        try {
          setData(
            (await composeImage([], {
              ...props,
              sources: [props.errorImage],
            })) as string,
          );
        } catch {
          setData("error");
        }
      }
    };
    fetchData();
  }, [serializedProps, setData]);

  const imgProps: ImgProps = {
    width: props.width,
    style: props.style,
    className: Array.isArray(props.className)
      ? props.className.join(" ")
      : props.className,
  };

  if (!data) {
    return <Spinner {...imgProps} />;
  } else if (data === "error") {
    return <Bug {...imgProps} />;
  } else {
    return <img src={data} {...imgProps} />;
  }
}

type ImgProps = {
  width?: number;
  style?: React.CSSProperties;
  className?: string;
};

function Spinner({ width, style, className }: ImgProps = {}) {
  return (
    <svg
      width={width || "128px"}
      height={width || "128px"}
      viewBox="0 0 100 100"
      style={style}
      className={className}
      fill="var(--ion-color-secondary)"
    >
      {[...Array(12)].map((_, i) => (
        <g transform={`rotate(${i * 30} 50 50)`} key={i}>
          <rect x="47" y="24" rx="9.4" ry="4.8" width="6" height="12">
            <animate
              attributeName="opacity"
              values="1;0"
              keyTimes="0;1"
              dur="1s"
              begin={`${i / 12 - 1}s`}
              repeatCount="indefinite"
            />
          </rect>
        </g>
      ))}
    </svg>
  );
}

function Bug({ width, style, className }: ImgProps = {}) {
  // https://tabler-icons.io/static/tabler-icons/icons/bug.svg
  return (
    <svg
      width={width || "128px"}
      height={width || "128px"}
      viewBox="0 0 24 24"
      style={style}
      className={className}
      stroke="var(--ion-color-secondary)"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      fill="none"
    >
      <path d="M9 9v-1a3 3 0 0 1 6 0v1" />
      <path d="M8 9h8a6 6 0 0 1 1 3v3a5 5 0 0 1 -10 0v-3a6 6 0 0 1 1 -3" />
      <path d="M3 13l4 0" />
      <path d="M17 13l4 0" />
      <path d="M12 20l0 -6" />
      <path d="M4 19l3.35 -2" />
      <path d="M20 19l-3.35 -2" />
      <path d="M4 7l3.75 2.4" />
      <path d="M20 7l-3.75 2.4" />
    </svg>
  );
}
