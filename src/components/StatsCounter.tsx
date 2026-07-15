import { useEffect, useRef, useState } from 'react'

const stats = [
  {
    svg: (
      <svg viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-8 h-8">
        <path d="M24 4L4 14l20 10 20-10L24 4z" fill="url(#g1)" opacity="0.9"/>
        <path d="M4 14v12M44 14v12" stroke="url(#g1)" strokeWidth="2.5" strokeLinecap="round"/>
        <path d="M10 20v10c0 5.523 6.268 10 14 10s14-4.477 14-10V20" fill="url(#g1)" opacity="0.25"/>
        <path d="M10 20v10c0 5.523 6.268 10 14 10s14-4.477 14-10V20" stroke="url(#g1)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
        <defs>
          <linearGradient id="g1" x1="0" y1="0" x2="48" y2="48" gradientUnits="userSpaceOnUse">
            <stop stopColor="#FFC83E"/>
            <stop offset="0.5" stopColor="#D946C6"/>
            <stop offset="1" stopColor="#7935EB"/>
          </linearGradient>
        </defs>
      </svg>
    ),
    value: 5000,
    suffix: '+',
    label: 'طالب مسجّل',
    bg: 'bg-orange-50',
    gradFrom: '#FFC83E',
    gradTo: '#D946C6',
  },
  {
    svg: (
      <svg viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-8 h-8">
        <rect x="4" y="8" width="40" height="28" rx="4" fill="url(#g2)" opacity="0.15"/>
        <rect x="4" y="8" width="40" height="28" rx="4" stroke="url(#g2)" strokeWidth="2.5"/>
        <circle cx="24" cy="22" r="7" fill="url(#g2)" opacity="0.9"/>
        <path d="M21 22l2 2 4-4" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
        <path d="M16 40h16M24 36v4" stroke="url(#g2)" strokeWidth="2.5" strokeLinecap="round"/>
        <defs>
          <linearGradient id="g2" x1="0" y1="0" x2="48" y2="48" gradientUnits="userSpaceOnUse">
            <stop stopColor="#D946C6"/>
            <stop offset="1" stopColor="#7935EB"/>
          </linearGradient>
        </defs>
      </svg>
    ),
    value: 200,
    suffix: '+',
    label: 'درس مرئي',
    bg: 'bg-pink-50',
    gradFrom: '#D946C6',
    gradTo: '#7935EB',
  },
  {
    svg: (
      <svg viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-8 h-8">
        <path d="M24 6C14.059 6 6 14.059 6 24s8.059 18 18 18 18-8.059 18-18S33.941 6 24 6z" fill="url(#g3)" opacity="0.15"/>
        <path d="M24 6C14.059 6 6 14.059 6 24s8.059 18 18 18 18-8.059 18-18S33.941 6 24 6z" stroke="url(#g3)" strokeWidth="2.5"/>
        <path d="M16 24l5.5 5.5L33 18" stroke="url(#g3)" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"/>
        <defs>
          <linearGradient id="g3" x1="0" y1="0" x2="48" y2="48" gradientUnits="userSpaceOnUse">
            <stop stopColor="#7935EB"/>
            <stop offset="1" stopColor="#2D174B"/>
          </linearGradient>
        </defs>
      </svg>
    ),
    value: 95,
    suffix: '%',
    label: 'هدفنا لدرجتك',
    bg: 'bg-purple-50',
    gradFrom: '#7935EB',
    gradTo: '#2D174B',
  },
  {
    svg: (
      <svg viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-8 h-8">
        <ellipse cx="24" cy="12" rx="14" ry="5" fill="url(#g4)" opacity="0.2"/>
        <ellipse cx="24" cy="12" rx="14" ry="5" stroke="url(#g4)" strokeWidth="2.5"/>
        <path d="M10 12v8c0 2.761 6.268 5 14 5s14-2.239 14-5v-8" stroke="url(#g4)" strokeWidth="2.5"/>
        <path d="M10 20v8c0 2.761 6.268 5 14 5s14-2.239 14-5v-8" stroke="url(#g4)" strokeWidth="2.5"/>
        <path d="M17 28l3 3 7-7" stroke="url(#g4)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
        <defs>
          <linearGradient id="g4" x1="0" y1="0" x2="48" y2="48" gradientUnits="userSpaceOnUse">
            <stop stopColor="#FFC83E"/>
            <stop offset="0.5" stopColor="#D946C6"/>
            <stop offset="1" stopColor="#7935EB"/>
          </linearGradient>
        </defs>
      </svg>
    ),
    value: 10000,
    suffix: '+',
    label: 'بنك أسئلة تجميعات',
    bg: 'bg-indigo-50',
    gradFrom: '#FFC83E',
    gradTo: '#7935EB',
  },
]

function useCountUp(target: number, duration: number = 2000, started: boolean) {
  const [count, setCount] = useState(0)
  useEffect(() => {
    if (!started) return
    let startTime: number | null = null
    const step = (timestamp: number) => {
      if (!startTime) startTime = timestamp
      const progress = Math.min((timestamp - startTime) / duration, 1)
      const eased = 1 - Math.pow(1 - progress, 3)
      setCount(Math.floor(eased * target))
      if (progress < 1) requestAnimationFrame(step)
    }
    requestAnimationFrame(step)
  }, [started, target, duration])
  return count
}

function StatCard({ stat, started }: { stat: typeof stats[0]; started: boolean }) {
  const count = useCountUp(stat.value, 2000, started)

  return (
    <div className="relative bg-white rounded-3xl p-6 shadow-sm border border-gray-100 overflow-hidden group hover:shadow-brand transition-all duration-300 hover:-translate-y-2 cursor-default">
      {/* Hover glow */}
      <div
        className="absolute inset-0 opacity-0 group-hover:opacity-5 transition-opacity duration-300"
        style={{ background: `linear-gradient(135deg, ${stat.gradFrom}, ${stat.gradTo})` }}
      />

      {/* Icon */}
      <div className={`w-16 h-16 rounded-2xl ${stat.bg} flex items-center justify-center mb-5 group-hover:scale-110 transition-transform duration-300`}>
        {stat.svg}
      </div>

      {/* Number */}
      <div className="flex items-baseline gap-0.5 mb-2 font-extrabold" style={{ direction: 'ltr', justifyContent: 'flex-start' }}>
        <span
          className="text-4xl leading-none"
          style={{
            background: `linear-gradient(135deg, ${stat.gradFrom}, ${stat.gradTo})`,
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
          }}
        >
          {count.toLocaleString('en-US')}
        </span>
        <span
          className="text-2xl"
          style={{
            background: `linear-gradient(135deg, ${stat.gradFrom}, ${stat.gradTo})`,
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
          }}
        >
          {stat.suffix}
        </span>
      </div>

      {/* Label */}
      <p className="text-gray-500 font-bold text-sm">{stat.label}</p>

      {/* Bottom bar */}
      <div
        className="absolute bottom-0 left-0 right-0 h-1 opacity-0 group-hover:opacity-100 transition-opacity duration-300"
        style={{ background: `linear-gradient(to right, ${stat.gradFrom}, ${stat.gradTo})` }}
      />
    </div>
  )
}

export default function StatsCounter() {
  const ref = useRef<HTMLDivElement>(null)
  const [started, setStarted] = useState(false)

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting && !started) setStarted(true) },
      { threshold: 0.3 }
    )
    if (ref.current) observer.observe(ref.current)
    return () => observer.disconnect()
  }, [started])

  return (
    <section ref={ref} className="max-w-5xl mx-auto px-4 -mt-8 relative z-10">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {stats.map((stat) => (
          <StatCard key={stat.label} stat={stat} started={started} />
        ))}
      </div>
    </section>
  )
}
