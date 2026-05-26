import { useEffect, useRef, useState } from 'react'
import { Users, BookOpen, Trophy, Target } from 'lucide-react'

const stats = [
  {
    icon: Users,
    value: 5000,
    suffix: '+',
    label: 'طالب مسجّل',
    color: 'from-brand-orange to-brand-pink',
    bg: 'bg-orange-50',
    iconColor: 'text-brand-orange',
  },
  {
    icon: BookOpen,
    value: 200,
    suffix: '+',
    label: 'درس مرئي',
    color: 'from-brand-pink to-brand-purple',
    bg: 'bg-pink-50',
    iconColor: 'text-brand-pink',
  },
  {
    icon: Trophy,
    value: 95,
    suffix: '٪',
    label: 'نسبة النجاح',
    color: 'from-brand-purple to-brand-navy',
    bg: 'bg-purple-50',
    iconColor: 'text-brand-purple',
  },
  {
    icon: Target,
    value: 1200,
    suffix: '+',
    label: 'سؤال تدريبي',
    color: 'from-brand-navy to-brand-purple',
    bg: 'bg-indigo-50',
    iconColor: 'text-brand-navy',
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
      // Ease out cubic
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
  const Icon = stat.icon

  return (
    <div className="relative bg-white rounded-3xl p-6 shadow-sm border border-gray-100 overflow-hidden group hover:shadow-brand transition-all duration-300 hover:-translate-y-1">
      {/* Background glow */}
      <div className={`absolute inset-0 bg-gradient-to-br ${stat.color} opacity-0 group-hover:opacity-5 transition-opacity duration-300`} />

      {/* Icon */}
      <div className={`w-14 h-14 rounded-2xl ${stat.bg} flex items-center justify-center mb-4 group-hover:scale-110 transition-transform duration-300`}>
        <Icon size={28} className={stat.iconColor} strokeWidth={2} />
      </div>

      {/* Number */}
      <div className="flex items-end gap-1 mb-1">
        <span
          className="text-4xl font-extrabold leading-none"
          style={{
            background: `linear-gradient(135deg, #FF8008, #E91E8C, #8B35C4)`,
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
          }}
        >
          {count.toLocaleString('ar-SA')}
        </span>
        <span
          className="text-2xl font-extrabold leading-snug"
          style={{
            background: `linear-gradient(135deg, #FF8008, #E91E8C, #8B35C4)`,
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
          }}
        >
          {stat.suffix}
        </span>
      </div>

      {/* Label */}
      <p className="text-gray-500 font-bold text-sm">{stat.label}</p>

      {/* Bottom gradient bar */}
      <div className={`absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r ${stat.color} opacity-0 group-hover:opacity-100 transition-opacity duration-300`} />
    </div>
  )
}

export default function StatsCounter() {
  const ref = useRef<HTMLDivElement>(null)
  const [started, setStarted] = useState(false)

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && !started) setStarted(true)
      },
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
