import { z } from "zod";

export const contestSchema = z.object({
  id: z.number(),
  name: z.string(),
  type: z.string(),
  phase: z.string(),
  durationSeconds: z.number(),
  startTimeSeconds: z.number(),
});

export const problemSchema = z.object({
  contestId: z.number(),
  index: z.string(),
  name: z.string(),
  type: z.string(),
  points: z.number().optional(),
  rating: z.number().optional(),
  tags: z.array(z.string()),
});

export const memberSchema = z.object({
  handle: z.string(),
  name: z.string().optional(),
  country: z.string().optional(),
  city: z.string().optional(),
  titlePhoto: z.string().optional(),
});

export const partySchema = z.object({
  contestId: z.number().optional(),
  members: z.array(memberSchema),
  participantType: z.string(),
  teamId: z.number().optional(),
  teamName: z.string().optional(),
  ghost: z.boolean(),
  room: z.number().optional(),
  startTimeSeconds: z.number().optional(),
});

export const problemResultSchema = z.object({
  points: z.number(),
  penalty: z.number().optional(),
  rejectedAttemptCount: z.number(),
  type: z.string(),
  bestSubmissionTimeSeconds: z.number().optional(),
});

export const ranklistRowSchema = z.object({
  party: partySchema,
  rank: z.number(),
  points: z.number(),
  penalty: z.number(),
  successfulHackCount: z.number(),
  unsuccessfulHackCount: z.number(),
  problemResults: z.array(problemResultSchema),
  lastSubmissionTimeSeconds: z.number().optional(),
});

export const standingsSchema = z.object({
  contest: contestSchema,
  problems: z.array(problemSchema),
  rows: z.array(ranklistRowSchema),
});

export const contestRequestSchema = z.object({
  contestId: z.number(),
  groupId: z.string().optional(),
  apiKey: z.string().optional(),
  apiSecret: z.string().optional(),
});

export const authRequestSchema = z.object({
  apiKey: z.string(),
  apiSecret: z.string(),
});

export type Contest = z.infer<typeof contestSchema>;
export type Problem = z.infer<typeof problemSchema>;
export type Member = z.infer<typeof memberSchema>;
export type Party = z.infer<typeof partySchema>;
export type ProblemResult = z.infer<typeof problemResultSchema>;
export type RanklistRow = z.infer<typeof ranklistRowSchema>;
export type Standings = z.infer<typeof standingsSchema>;
export type ContestRequest = z.infer<typeof contestRequestSchema>;

export interface StandingsRowWithCustomPenalty extends RanklistRow {
  customPenalty: number;
  solvedCount: number;
}

export interface StandingsWithCustomPenalty {
  contest: Contest;
  problems: Problem[];
  rows: StandingsRowWithCustomPenalty[];
}
