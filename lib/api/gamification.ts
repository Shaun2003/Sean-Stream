import { supabase } from '@/lib/supabase/client';
import { recordPlay as localRecordPlay, recordLike as localRecordLike, recordPlaylistCreate as localRecordPlaylistCreate } from '@/lib/gamification';
import type { Achievement } from '@/lib/gamification';

async function getOrCreateUserGamification(userId: string) {
  let { data: userGamification, error } = await supabase
    .from('user_gamification')
    .select('*')
    .eq('user_id', userId)
    .single();

  if (error && error.code === 'PGRST116') {
    // No row found, create one
    const { data: newUserGamification, error: insertError } = await supabase
      .from('user_gamification')
      .insert({ user_id: userId })
      .single();
    if (insertError) throw insertError;
    userGamification = newUserGamification;
  } else if (error) {
    throw error;
  }

  return userGamification;
}

export async function handleRecordPlay(userId: string, duration: number): Promise<{ newAchievements: Achievement[]; leveledUp: boolean }> {
  const userGamification = await getOrCreateUserGamification(userId);

  const today = new Date().toISOString().split('T')[0];
  let streak = userGamification.streak;
  let longest_streak = userGamification.longest_streak;

  if (userGamification.last_listened_date) {
    const lastDate = new Date(userGamification.last_listened_date);
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    if (lastDate.toISOString().split('T')[0] === yesterday.toISOString().split('T')[0]) {
      streak++;
    } else if (lastDate.toISOString().split('T')[0] !== today) {
      streak = 1;
    }
  } else {
    streak = 1;
  }

  if (streak > longest_streak) {
    longest_streak = streak;
  }

  const { newAchievements, leveledUp, newXp } = localRecordPlay(duration, userGamification);

  const { data, error } = await supabase
    .from('user_gamification')
    .update({
      xp: newXp,
      level: leveledUp ? userGamification.level + 1 : userGamification.level,
      streak,
      longest_streak,
      last_listened_date: today,
      total_tracks_played: userGamification.total_tracks_played + 1,
      total_listening_minutes: userGamification.total_listening_minutes + Math.round(duration / 60),
    })
    .eq('user_id', userId);

  if (error) throw error;

  if (newAchievements.length > 0) {
    const achievementsToInsert = newAchievements.map(ach => ({ user_id: userId, achievement_id: ach.id }));
    await supabase.from('user_achievements').insert(achievementsToInsert);
  }

  return { newAchievements, leveledUp };
}

export async function handleRecordLike(userId: string): Promise<{ newAchievements: Achievement[]; leveledUp: boolean }> {
  const userGamification = await getOrCreateUserGamification(userId);

  const { newAchievements, leveledUp, newXp } = localRecordLike(userGamification);

  const { data, error } = await supabase
    .from('user_gamification')
    .update({
      xp: newXp,
      level: leveledUp ? userGamification.level + 1 : userGamification.level,
      total_likes: userGamification.total_likes + 1,
    })
    .eq('user_id', userId);
  
  if (error) throw error;

  if (newAchievements.length > 0) {
    const achievementsToInsert = newAchievements.map(ach => ({ user_id: userId, achievement_id: ach.id }));
    await supabase.from('user_achievements').insert(achievementsToInsert);
  }

  return { newAchievements, leveledUp };
}

export async function handleRecordPlaylistCreate(userId: string): Promise<{ newAchievements: Achievement[]; leveledUp: boolean }> {
  const userGamification = await getOrCreateUserGamification(userId);

  const { newAchievements, leveledUp, newXp } = localRecordPlaylistCreate(userGamification);

  const { data, error } = await supabase
    .from('user_gamification')
    .update({
      xp: newXp,
      level: leveledUp ? userGamification.level + 1 : userGamification.level,
      total_playlists: userGamification.total_playlists + 1,
    })
    .eq('user_id', userId);

  if (error) throw error;

  if (newAchievements.length > 0) {
    const achievementsToInsert = newAchievements.map(ach => ({ user_id: userId, achievement_id: ach.id }));
    await supabase.from('user_achievements').insert(achievementsToInsert);
  }

  return { newAchievements, leveledUp };
}
