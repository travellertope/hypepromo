import type { FastifyInstance } from 'fastify'
import { eq, desc, and } from 'drizzle-orm'
import { db } from '@promoet/db/client'
import { leaderboardEntries, seasons, creators } from '@promoet/db/schema'

export default async function leaderboardRoutes(app: FastifyInstance) {
  // GET /v1/leaderboards/active — current season top 50
  app.get('/leaderboards/active', async (_req, rep) => {
    const [season] = await db
      .select()
      .from(seasons)
      .where(eq(seasons.status, 'active'))
      .limit(1)

    if (!season) return rep.send({ season: null, items: [] })

    const rows = await db
      .select({
        rank: leaderboardEntries.rank,
        earningsKobo: leaderboardEntries.earningsKobo,
        validClicks: leaderboardEntries.validClicks,
        state: leaderboardEntries.state,
        niche: leaderboardEntries.niche,
        handle: creators.handle,
        tier: creators.tier,
        level: creators.level,
      })
      .from(leaderboardEntries)
      .innerJoin(creators, eq(creators.id, leaderboardEntries.creatorId))
      .where(eq(leaderboardEntries.seasonId, season.id))
      .orderBy(leaderboardEntries.rank)
      .limit(50)

    return rep.send({
      season: {
        id: season.id,
        name: season.name,
        startsAt: season.startsAt,
        endsAt: season.endsAt,
      },
      items: rows.map((r) => ({ ...r, earningsKobo: Number(r.earningsKobo) })),
    })
  })

  // GET /v1/leaderboards/state/:state — top 20 in a state
  app.get('/leaderboards/state/:state', async (req, rep) => {
    const { state } = req.params as { state: string }

    const [season] = await db
      .select({ id: seasons.id, name: seasons.name })
      .from(seasons)
      .where(eq(seasons.status, 'active'))
      .limit(1)

    if (!season) return rep.send({ season: null, items: [] })

    const rows = await db
      .select({
        rank: leaderboardEntries.rank,
        earningsKobo: leaderboardEntries.earningsKobo,
        validClicks: leaderboardEntries.validClicks,
        handle: creators.handle,
        tier: creators.tier,
        level: creators.level,
      })
      .from(leaderboardEntries)
      .innerJoin(creators, eq(creators.id, leaderboardEntries.creatorId))
      .where(and(eq(leaderboardEntries.seasonId, season.id), eq(leaderboardEntries.state, state)))
      .orderBy(leaderboardEntries.rank)
      .limit(20)

    return rep.send({
      season,
      state,
      items: rows.map((r) => ({ ...r, earningsKobo: Number(r.earningsKobo) })),
    })
  })
}
