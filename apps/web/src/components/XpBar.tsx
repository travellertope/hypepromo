'use client'

interface XpBarProps {
  xp: number
  level: number
  streakDays: number
}

function xpToLevel(xp: number): number {
  return Math.floor(Math.pow(xp / 100, 1 / 1.6))
}

function xpForLevel(level: number): number {
  return Math.ceil(Math.pow(level, 1.6) * 100)
}

export function XpBar({ xp, level, streakDays }: XpBarProps) {
  const currentLevelXp = xpForLevel(level)
  const nextLevelXp = xpForLevel(level + 1)
  const progress = Math.min(
    ((xp - currentLevelXp) / (nextLevelXp - currentLevelXp)) * 100,
    100,
  )

  return (
    <div className="px-4 py-2">
      <div className="flex items-center justify-between mb-1">
        <span className="text-xs text-white/60">
          Lv.<span className="text-cyber-neon font-bold">{level}</span>
        </span>
        <span className="text-xs text-white/40">{xp.toLocaleString()} XP</span>
        {streakDays > 0 && (
          <span className="text-xs text-orange-400 font-semibold">🔥 {streakDays}d streak</span>
        )}
      </div>
      <div className="h-1.5 rounded-full bg-white/10 overflow-hidden">
        <div
          className="h-full rounded-full bg-gradient-to-r from-cyber-neon to-cyber-accent transition-all"
          style={{ width: `${progress}%` }}
        />
      </div>
    </div>
  )
}
