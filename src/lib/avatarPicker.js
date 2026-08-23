import { AVATAR_COLORS, AVATAR_EMOJIS } from './constants'

// Picks a random emoji + color for a new student, preferring an emoji no
// one else in the class is currently using. With up to 25 students against
// a pool of 30 emojis, collisions should be rare — if the pool does run out
// this just falls back to a fully random pick rather than erroring.
export function pickRandomAvatar(usedEmojis = []) {
  const available = AVATAR_EMOJIS.filter((e) => !usedEmojis.includes(e))
  const pool = available.length > 0 ? available : AVATAR_EMOJIS
  const avatar_emoji = pool[Math.floor(Math.random() * pool.length)]
  const avatar_color = AVATAR_COLORS[Math.floor(Math.random() * AVATAR_COLORS.length)]
  return { avatar_emoji, avatar_color }
}
