import { eq } from 'drizzle-orm'
import { db } from '@promoet/db/client'
import { creators, xpEvents } from '@promoet/db/schema'
import { xpToLevel } from '@promoet/config'

export type XpKind = 'quest_claim' | 'click_release' | 'first_clicks_bonus' | 'fraud_penalty' | 'post_proof_approved'

export async function awardXp(
  creatorId: string,
  kind: XpKind,
  amount: number,
  refId?: string,
): Promise<{ newXp: number; newLevel: number }> {
  return db.transaction(async (tx) => {
    const [creator] = await tx
      .select({ xp: creators.xp })
      .from(creators)
      .where(eq(creators.id, creatorId))
      .limit(1)

    if (!creator) throw new Error('CREATOR_NOT_FOUND')

    const nextXp = Math.max(0, creator.xp + amount)
    const nextLevel = xpToLevel(nextXp)

    await tx
      .update(creators)
      .set({ xp: nextXp, level: nextLevel, updatedAt: new Date() })
      .where(eq(creators.id, creatorId))

    await tx.insert(xpEvents).values({ creatorId, kind, amount, refId })

    return { newXp: nextXp, newLevel: nextLevel }
  })
}
