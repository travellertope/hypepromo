import { eq, and, lte, sql } from 'drizzle-orm'
import { db } from '@promoet/db/client'
import { clicks, referralLinks, quests } from '@promoet/db/schema'
import { buildHoldRelease, postTransaction } from '@promoet/ledger'
import { awardXp } from '../xp/service.ts'

const BATCH_SIZE = 100

export async function releaseHeldClicks(): Promise<{ released: number; errors: number }> {
  const now = new Date()
  let released = 0
  let errors = 0

  // Fetch a batch of clicks ready to release
  const heldClicks = await db
    .select({
      id: clicks.id,
      linkId: clicks.linkId,
      creatorUnitKobo: clicks.creatorUnitKobo,
    })
    .from(clicks)
    .where(
      and(
        eq(clicks.status, 'held'),
        lte(clicks.heldUntil, now),
      ),
    )
    .limit(BATCH_SIZE)

  for (const click of heldClicks) {
    try {
      // Resolve creator via link → quest
      const [questRow] = await db
        .select({ creatorId: quests.creatorId })
        .from(referralLinks)
        .innerJoin(quests, eq(quests.id, referralLinks.questId))
        .where(eq(referralLinks.id, click.linkId))
        .limit(1)

      if (!questRow) {
        await db
          .update(clicks)
          .set({ status: 'released', releasedAt: now })
          .where(eq(clicks.id, click.id))
        released++
        continue
      }

      await db.transaction(async (tx) => {
        await tx
          .update(clicks)
          .set({ status: 'released', releasedAt: now })
          .where(eq(clicks.id, click.id))

        const ledgerTx = buildHoldRelease({
          creatorId: questRow.creatorId,
          amountKobo: click.creatorUnitKobo,
          refId: click.id,
        })
        await postTransaction(tx as any, ledgerTx)
      })

      // Award XP outside the DB transaction (non-fatal)
      awardXp(questRow.creatorId, 'click_release', 1, click.id).catch((err) => {
        console.error('XP award failed for click', click.id, err)
      })

      released++
    } catch (err) {
      console.error('Failed to release click', click.id, err)
      errors++
    }
  }

  return { released, errors }
}
