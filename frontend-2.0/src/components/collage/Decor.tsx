import Image from 'next/image'
import type { CSSProperties, ReactNode } from 'react'
import HoverVideoFrame from '@/components/collage/HoverVideoFrame'

type Box = { className?: string; style?: CSSProperties }

export function Polaroid({
  src,
  videoSrc,
  alt,
  caption,
  className = '',
  style,
  sizes = '(max-width: 760px) 40vw, 280px',
  priority = false,
}: Box & {
  src: string
  videoSrc?: string
  alt: string
  caption?: string
  sizes?: string
  priority?: boolean
}) {
  return (
    <figure className={`polaroid ${className}`} style={style}>
      <div style={{ position: 'relative', width: '100%', height: '100%' }}>
        {videoSrc ? (
          <HoverVideoFrame
            src={src}
            videoSrc={videoSrc}
            alt={alt}
            sizes={sizes}
            priority={priority}
          />
        ) : (
          <Image src={src} alt={alt} fill sizes={sizes} priority={priority} style={{ objectFit: 'cover' }} />
        )}
      </div>
      {caption ? <figcaption className="polaroid-cap">{caption}</figcaption> : null}
    </figure>
  )
}

export function Tape({
  variant = 'cream',
  className = '',
  style,
}: Box & { variant?: 'cream' | 'blue' | 'pink' | 'dark' }) {
  return <span aria-hidden className={`tape tape--${variant} ${className}`} style={style} />
}

export function Stamp({
  src,
  videoSrc,
  alt,
  className = '',
  style,
  sizes = '180px',
}: Box & { src: string; videoSrc?: string; alt: string; sizes?: string }) {
  return (
    <span className={`stamp ${className}`} style={style}>
      <span style={{ position: 'relative', display: 'block', width: '100%', height: '100%' }}>
        {videoSrc ? (
          <HoverVideoFrame src={src} videoSrc={videoSrc} alt={alt} sizes={sizes} />
        ) : (
          <Image src={src} alt={alt} fill sizes={sizes} style={{ objectFit: 'cover' }} />
        )}
      </span>
    </span>
  )
}

export function Pin({ className = '', style }: Box) {
  return <span aria-hidden className={`pin ${className}`} style={style} />
}

export function Postmark({
  top = 'NEW DELHI',
  bottom = 'INDIA',
  className = '',
  style,
}: Box & { top?: string; bottom?: string }) {
  return (
    <svg viewBox="0 0 120 120" className={className} style={style} aria-hidden focusable="false">
      <defs>
        <path id="pm-top" d="M60,60 m-40,0 a40,40 0 1,1 80,0" fill="none" />
        <path id="pm-bottom" d="M60,60 m-40,0 a40,40 0 1,0 80,0" fill="none" />
      </defs>
      <circle cx="60" cy="60" r="46" fill="none" stroke="currentColor" strokeWidth="1.4" opacity="0.85" />
      <circle cx="60" cy="60" r="33" fill="none" stroke="currentColor" strokeWidth="0.9" opacity="0.6" />
      <text fontSize="8.4" letterSpacing="1.6" fill="currentColor" fontWeight="600">
        <textPath href="#pm-top" startOffset="50%" textAnchor="middle">{top}</textPath>
      </text>
      <text fontSize="7.4" letterSpacing="1.4" fill="currentColor" fontWeight="600">
        <textPath href="#pm-bottom" startOffset="50%" textAnchor="middle">{bottom}</textPath>
      </text>
      <text x="60" y="64" textAnchor="middle" fontSize="13" fill="currentColor" fontFamily="Instrument Serif, serif">26</text>
      <path d="M32 84 h56 M32 90 h44" stroke="currentColor" strokeWidth="1" opacity="0.55" />
    </svg>
  )
}

export function PaperClip({ className = '', style }: Box) {
  return (
    <svg viewBox="0 0 90 190" className={className} style={style} aria-hidden focusable="false">
      <path
        d="M62 174 V44 a18 18 0 0 0-36 0 V140 a12 12 0 0 0 24 0 V58"
        fill="none"
        stroke="url(#clip-metal)"
        strokeWidth="7"
        strokeLinecap="round"
      />
      <defs>
        <linearGradient id="clip-metal" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#d9d6cd" />
          <stop offset="0.45" stopColor="#8c8880" />
          <stop offset="1" stopColor="#c8c5bc" />
        </linearGradient>
      </defs>
    </svg>
  )
}

export function Doodle({
  variant = 'squiggle',
  className = '',
  style,
  width = 180,
}: Box & { variant?: 'squiggle' | 'arrow' | 'curve' | 'star' | 'circle' | 'sparkle'; width?: number }) {
  const specs: Record<string, { viewBox: string; node: ReactNode }> = {
    // Exact path from aprilleihuanani.com ("doodle dashed line")
    squiggle: {
      viewBox: '0 0 192 210',
      node: (
        <path
          d="M33.8346 8.10432C32.3516 8.71657 27.1244 13.2875 20.7344 20C17.5949 23.298 14.4356 28.5036 12.8497 36.9808C9.94526 52.5062 9.48746 63.6761 9.74225 67.6386C10.6216 81.3145 13.9422 87.7015 19.5232 96.5488C23.8118 103.347 29.6391 106.968 37.4217 111.169C49.3351 117.599 64.5122 114.956 76.5561 110.575C88.5814 106.2 91.3882 99.4957 93.7273 92.8905C95.3582 88.285 94.7851 84.5591 94.2621 82.9604C93.7296 81.333 92.1655 80.244 90.5214 79.2975C88.6055 78.1946 85.745 78.0558 82.8594 78.0952C76.5191 78.1818 73.0303 87.5205 71.4135 92.5718C70.1471 96.5284 70.784 100.213 71.6038 102.336C73.1144 106.248 78.0115 107.712 91.894 110.479C103.27 112.747 123.741 115.081 135.752 117.039C150.875 119.505 157.718 123.202 164.264 126.729C172.629 131.235 178.731 139.306 181.616 145.169C182.187 146.328 182.5 148.062 182.598 150.211C183.369 167.09 178.87 185.192 167.959 198.093C167.195 198.878 166.187 199.711 163.015 201.788"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.4"
          strokeLinecap="round"
          strokeDasharray="5 5"
        />
      ),
    },
    // Exact path from aprilleihuanani.com ("SVG dashed curve")
    curve: {
      viewBox: '0 0 176 141',
      node: (
        <>
          <path
            d="M14.6421 45.5151C14.0307 49.3349 14.3371 46.8159 14.0149 50.6701C13.6927 54.5243 13.2131 61.3843 13.1471 67.0472C13.081 72.7102 13.2786 77.0678 13.9021 80.5625C14.9973 86.7014 15.2324 93.5365 20.6321 101.12C24.3577 106.352 28.9951 112.502 33.3106 117.22C37.6262 121.937 42.8538 123.622 45.6816 124.937C51.4306 127.612 58.6838 130.128 69.5449 130.852C76.1755 131.293 85.1215 131.441 91.7068 131.28C98.2921 131.118 102.451 130.675 108.922 129.322"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.4"
            strokeLinecap="round"
            strokeDasharray="5 5"
          />
          <path
            d="M108.921 129.322C115.392 127.969 120.677 124.701 125.957 123.011C131.238 121.32 134.998 117.964 136.893 116.612C140.665 113.922 143.138 112.098 146.162 107.438C148.005 104.598 150.834 99.999 149.699 92.3113C148.563 84.6138 147.239 78.3669 144.91 74.1141C142.475 69.668 140.04 65.1481 135.745 61.004C129.752 55.2223 123.172 48.7011 116.648 47.4161C108.275 45.767 101.055 45.123 99.1929 47.3904C98.6691 48.0281 95.7097 51.5003 95.5548 53.1067C94.8649 60.2572 97.222 66.2304 102.065 70.5716C107.015 75.0086 113.544 79.8042 123.72 80.1921C134.391 80.5989 143.037 80.8477 146.709 79.2373C153.359 76.3208 158.74 71.7561 160.531 66.3206C161.258 64.1116 163.96 57.0456 163.325 45.6567C162.962 39.1431 160.778 28.878 155.795 23.3927C151.082 18.2058 145.362 11.3655 137.26 8.09445"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.4"
            strokeLinecap="round"
            strokeDasharray="5 5"
          />
        </>
      ),
    },
    // Looped dashed curve + hand-drawn arrowhead matching aprilleihuanani.com
    arrow: {
      viewBox: '0 0 176 141',
      node: (
        <>
          <path
            d="M14.6421 45.5151C14.0307 49.3349 14.3371 46.8159 14.0149 50.6701C13.6927 54.5243 13.2131 61.3843 13.1471 67.0472C13.081 72.7102 13.2786 77.0678 13.9021 80.5625C14.9973 86.7014 15.2324 93.5365 20.6321 101.12C24.3577 106.352 28.9951 112.502 33.3106 117.22C37.6262 121.937 42.8538 123.622 45.6816 124.937C51.4306 127.612 58.6838 130.128 69.5449 130.852C76.1755 131.293 85.1215 131.441 91.7068 131.28C98.2921 131.118 102.451 130.675 108.922 129.322C115.392 127.969 120.677 124.701 125.957 123.011C131.238 121.32 134.998 117.964 136.893 116.612C140.665 113.922 143.138 112.098 146.162 107.438C148.005 104.598 150.834 99.999 149.699 92.3113C148.563 84.6138 147.239 78.3669 144.91 74.1141C142.475 69.668 140.04 65.1481 135.745 61.004C129.752 55.2223 123.172 48.7011 116.648 47.4161C108.275 45.767 101.055 45.123 99.1929 47.3904C98.6691 48.0281 95.7097 51.5003 95.5548 53.1067C94.8649 60.2572 97.222 66.2304 102.065 70.5716C107.015 75.0086 113.544 79.8042 123.72 80.1921C134.391 80.5989 143.037 80.8477 146.709 79.2373C153.359 76.3208 158.74 71.7561 160.531 66.3206C161.258 64.1116 163.96 57.0456 163.325 45.6567C162.962 39.1431 160.778 28.878 155.795 23.3927C151.082 18.2058 145.362 11.3655 137.26 8.09445"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.4"
            strokeLinecap="round"
            strokeDasharray="5 5"
          />
          <path
            d="M148 4.5 L136 7.8 L142.5 18.5"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.4"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </>
      ),
    },
    // Exact path from aprilleihuanani.com ("broken line doodle")
    circle: {
      viewBox: '0 0 179 49',
      node: (
        <path
          d="M42.2855 46.2589C43.3916 46.2589 44.4978 46.2589 59.3477 46.1684C74.1977 46.0779 102.758 45.8969 120.461 45.4945C138.163 45.0921 144.143 44.4738 148.356 43.9113C154.879 43.0402 159.551 41.3532 164.407 39.0046C169.754 36.4186 173.171 32.9095 175.336 29.5457C177.995 25.4154 176.916 20.8566 175.88 17.745C174.94 14.9216 170.437 12.351 163.065 9.30795C158.693 7.50309 152.256 6.34737 134.373 5.04133C116.489 3.73529 87.1542 2.61518 70.2251 2.3296C53.296 2.04403 50.001 1.75884 44.001 2.32954C38.456 2.85696 31.7762 3.39024 27.001 5.04133C19.7903 7.5345 14.1811 10.0499 10.0001 13.2589C5.72431 16.5407 4.99863 23.2589 5 27.2589C5.00049 28.6798 7.271 32.575 8.50036 33.7589C11.4202 36.5707 14.7005 36.7602 21.9083 39.1858C25.5148 40.3027 29.0173 41.1881 32.8437 41.7588C36.6702 42.3296 40.7147 42.559 44.8816 42.7954"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.4"
          strokeLinecap="round"
          strokeDasharray="5 5"
        />
      ),
    },
    star: {
      viewBox: '0 0 100 96',
      node: (
        <path
          d="M50 8 60 38 90 48 60 58 50 88 40 58 10 48 40 38Z"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.6"
          strokeLinejoin="round"
        />
      ),
    },
    sparkle: {
      viewBox: '0 0 80 80',
      node: (
        <path
          d="M40 6v22M40 52v22M6 40h22M52 40h22M18 18l14 14M48 48l14 14M62 18 48 32M32 48 18 62"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.2"
          strokeLinecap="round"
        />
      ),
    },
  }
  const spec = specs[variant] ?? specs.squiggle
  return (
    <svg viewBox={spec.viewBox} width={width} className={`doodle ${className}`} style={style} aria-hidden focusable="false">
      {spec.node}
    </svg>
  )
}

export type StickerName =
  | 'pink-doodle-star'
  | 'kraft-paper-tape'
  | 'gold-safety-pin-pink-tape'
  | 'baby-blue-washi'
  | 'blush-washi'
  | 'black-push-pin'
  | 'gold-paper-clip'
  | 'silver-bulldog-clip'
  | 'heart-postage-stamp'
  | 'pink-satin-bow'
  | 'monarch-butterfly-sketch'
  | 'retro-film-camera'
  | 'cherry-postage-stamp'
  | 'black-embroidered-star'
  | 'beige-heart-button'
  | 'good-things-are-coming-ticket'
  | 'yellow-star-doodle'
  | 'sparkle-glasses'
  | 'wavy-quote-ribbon'

export function Sticker({
  name,
  width = 88,
  className = '',
  style,
}: Box & { name: StickerName; width?: number }) {
  return (
    <img
      src={`/assets/stickers/${name}.png`}
      alt=""
      width={width}
      height={width}
      aria-hidden="true"
      draggable={false}
      loading="lazy"
      className={`sticker ${className}`}
      style={{ width, height: 'auto', ...style }}
    />
  )
}

export function FilmStrip({ className = '', style }: Box) {
  return (
    <div aria-hidden className={`filmstrip ${className}`} style={style}>
      <span className="filmstrip-frame" />
      <span className="filmstrip-frame" />
      <span className="filmstrip-frame" />
    </div>
  )
}
