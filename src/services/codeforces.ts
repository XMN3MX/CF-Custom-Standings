import {
  StandingsWithCustomPenalty,
  StandingsRowWithCustomPenalty,
  ProblemResult,
  Submission,
  Problem,
} from "@/schema";
import { createHash } from "crypto";

export class CodeforcesService {
  private baseUrl = "https://codeforces.com/api";
  private apiKey: string | undefined;
  private apiSecret: string | undefined;
  private groupId: string | undefined;
  private contestId: number;

  constructor() {
    this.apiKey = process.env.API_KEY;
    this.apiSecret = process.env.API_SECRET;
    this.groupId = process.env.GROUP_ID;
    this.contestId = Number(process.env.CONTEST_ID);
  }

  async getContestStandings(): Promise<StandingsWithCustomPenalty> {
    // Get contest info and phase
    const contest = await this.getContestInfo();
    if (contest.phase === "BEFORE") {
      return {
        contest,
        problems: [],
        rows: [],
        firstSolvers: {},
      };
    }
    // 1. Fetch all submissions
    const submissions = await this.getContestStatus();
    if (!submissions.length) {
      // Contest hasn't started yet or no submissions
      return {
        contest,
        problems: [],
        rows: [],
        firstSolvers: {},
      };
    }

    // Filter out submissions that occur after contest end
    const contestEndTime = contest.startTimeSeconds + contest.durationSeconds;
    const validSubmissions = submissions.filter(
      (submission) => submission.relativeTimeSeconds <= contest.durationSeconds
    );
    
    // Get submissions after contest end for "out of competition" participants
    const outOfCompetitionSubmissions = submissions.filter(
      (submission) => submission.relativeTimeSeconds > contest.durationSeconds
    );

    // Always use the problem letters from env variable for problems array
    const PROBLEM_LETTERS = (process.env.CONTEST_PROBLEMS || '').split(',').filter(Boolean);
    const problems: Problem[] = PROBLEM_LETTERS.map((letter) => ({
      contestId: this.contestId,
      index: letter,
      name: letter,
      type: "PROGRAMMING",
      tags: [],
    }));

    // 3. Build participants set from submissions (include official and virtual contestants)
    const participantMap: Record<string, { handle: string; teamName?: string, participantType: string }> = {};
    validSubmissions.forEach((sub) => {
      const handle = sub.author.members?.[0]?.handle || sub.author.teamName || "Unknown";
      const participantType = sub.author.participantType;
      // Include both official contestants and virtual contestants
      if (participantType !== "CONTESTANT" && participantType !== "VIRTUAL" && participantType !== "PRACTICE") return;
      if (!participantMap[handle]) {
        participantMap[handle] = {
          handle,
          teamName: sub.author.teamName,
          participantType,
        };
      }
    });
    const participants = Object.values(participantMap);

    // Build ignoredWrongsMap: { [userHandle]: { [problemIndex]: ignoredWrongCount } }
    const ignoredWrongsMap: Record<string, Record<string, number>> = {};
    validSubmissions.forEach((submission: Submission) => {
      if (
        submission.verdict === "WRONG_ANSWER" &&
        submission.passedTestCount === 0
      ) {
        const participantHandle =
          submission.author.members?.[0]?.handle ||
          submission.author.teamName ||
          "Unknown";
        const problemIndex = submission.problem.index;
        if (!ignoredWrongsMap[participantHandle]) {
          ignoredWrongsMap[participantHandle] = {};
        }
        if (!ignoredWrongsMap[participantHandle][problemIndex]) {
          ignoredWrongsMap[participantHandle][problemIndex] = 0;
        }
        ignoredWrongsMap[participantHandle][problemIndex] += 1;
      }
    });

    // 4. For each participant, for each problem, build ProblemResult
    const rows: StandingsRowWithCustomPenalty[] = participants.map((participant) => {
      const problemResults: ProblemResult[] = problems.map((problem) => {
        // All submissions for this participant and problem
        const subs = validSubmissions.filter(
          (s) =>
            (s.author.members?.[0]?.handle || s.author.teamName || "Unknown") === participant.handle &&
            s.problem.index === problem.index
        );
        // Sort by time
        subs.sort((a, b) => a.relativeTimeSeconds - b.relativeTimeSeconds);
        let rejectedAttemptCount = 0;
        let bestSubmissionTimeSeconds: number | undefined = undefined;
        let points = 0;
        for (const sub of subs) {
          if (sub.verdict === "OK") {
            points = 1; // ICPC style: 1 if solved
            bestSubmissionTimeSeconds = sub.relativeTimeSeconds;
            break;
          } else if (sub.verdict === "WRONG_ANSWER") {
            rejectedAttemptCount++;
          }
        }
        return {
          type: "PROGRAMMING",
          points,
          rejectedAttemptCount,
          penalty: 0,
          bestSubmissionTimeSeconds,
        };
      });
      // Calculate custom penalty and solved count, using ignoredWrongsMap
      const ignoredWrongsForUser = ignoredWrongsMap[participant.handle] || {};
      const { customPenalty, solvedCount, actualWACounts } = this.calculateCustomPenalty(
        problemResults,
        problems,
        ignoredWrongsForUser
      );
      // Add actualWACount to each problemResult
      const problemResultsWithActualWA = problemResults.map((pr, idx) => ({
        ...pr,
        actualWACount: actualWACounts[idx],
      }));
      // Calculate total points and penalty for the row
      const totalPoints = problemResults.reduce((acc, pr) => acc + (pr.points || 0), 0);
      const totalPenalty = problemResults.reduce((acc, pr) => acc + (pr.penalty || 0), 0);
      return {
        party: {
          members: [{ handle: participant.handle }],
          teamName: participant.teamName,
          participantType: participant.participantType,
          ghost: false,
        },
        rank: 0, // will be set later
        points: totalPoints,
        penalty: totalPenalty,
        successfulHackCount: 0,
        unsuccessfulHackCount: 0,
        problemResults: problemResultsWithActualWA,
        customPenalty,
        solvedCount,
      };
    });

    // 5. Sort and rank
    rows.sort((a, b) => {
      if (a.solvedCount !== b.solvedCount) {
        return b.solvedCount - a.solvedCount;
      }
      return a.customPenalty - b.customPenalty;
    });
    rows.forEach((row, index) => {
      if (
        index > 0 &&
        row.solvedCount === rows[index - 1].solvedCount &&
        row.customPenalty === rows[index - 1].customPenalty
      ) {
        row.rank = rows[index - 1].rank;
      } else {
        row.rank = index + 1;
      }
    });

    // 6. Get first solvers
    const firstSolvers = this.getFirstSolvers(validSubmissions);

    // 7. Process out of competition participants
    const outOfCompetitionRows: StandingsRowWithCustomPenalty[] = [];
    if (outOfCompetitionSubmissions.length > 0) {
      // Build out of competition participants set
      const outOfCompetitionMap: Record<string, { handle: string; teamName?: string, participantType: string }> = {};
      outOfCompetitionSubmissions.forEach((sub) => {
        const handle = sub.author.members?.[0]?.handle || sub.author.teamName || "Unknown";
        const participantType = sub.author.participantType;
        if (!outOfCompetitionMap[handle]) {
          outOfCompetitionMap[handle] = {
            handle,
            teamName: sub.author.teamName,
            participantType,
          };
        }
      });
      const outOfCompetitionParticipants = Object.values(outOfCompetitionMap);

      // Build ignoredWrongsMap for out of competition
      const outOfCompetitionIgnoredWrongsMap: Record<string, Record<string, number>> = {};
      outOfCompetitionSubmissions.forEach((submission: Submission) => {
        if (
          submission.verdict === "WRONG_ANSWER" &&
          submission.passedTestCount === 0
        ) {
          const participantHandle =
            submission.author.members?.[0]?.handle ||
            submission.author.teamName ||
            "Unknown";
          const problemIndex = submission.problem.index;
          if (!outOfCompetitionIgnoredWrongsMap[participantHandle]) {
            outOfCompetitionIgnoredWrongsMap[participantHandle] = {};
          }
          if (!outOfCompetitionIgnoredWrongsMap[participantHandle][problemIndex]) {
            outOfCompetitionIgnoredWrongsMap[participantHandle][problemIndex] = 0;
          }
          outOfCompetitionIgnoredWrongsMap[participantHandle][problemIndex] += 1;
        }
      });

      // Build rows for out of competition participants
      outOfCompetitionRows.push(...outOfCompetitionParticipants.map((participant) => {
        const problemResults: ProblemResult[] = problems.map((problem) => {
          const subs = outOfCompetitionSubmissions.filter(
            (s) =>
              (s.author.members?.[0]?.handle || s.author.teamName || "Unknown") === participant.handle &&
              s.problem.index === problem.index
          );
          subs.sort((a, b) => a.relativeTimeSeconds - b.relativeTimeSeconds);
          let rejectedAttemptCount = 0;
          let bestSubmissionTimeSeconds: number | undefined = undefined;
          let points = 0;
          for (const sub of subs) {
            if (sub.verdict === "OK") {
              points = 1;
              bestSubmissionTimeSeconds = sub.relativeTimeSeconds;
              break;
            } else if (sub.verdict === "WRONG_ANSWER") {
              rejectedAttemptCount++;
            }
          }
          return {
            type: "PROGRAMMING",
            points,
            rejectedAttemptCount,
            penalty: 0,
            bestSubmissionTimeSeconds,
          };
        });

        const ignoredWrongsForUser = outOfCompetitionIgnoredWrongsMap[participant.handle] || {};
        const { customPenalty, solvedCount, actualWACounts } = this.calculateCustomPenalty(
          problemResults,
          problems,
          ignoredWrongsForUser
        );

        const problemResultsWithActualWA = problemResults.map((pr, idx) => ({
          ...pr,
          actualWACount: actualWACounts[idx],
        }));

        const totalPoints = problemResults.reduce((acc, pr) => acc + (pr.points || 0), 0);
        const totalPenalty = problemResults.reduce((acc, pr) => acc + (pr.penalty || 0), 0);

        return {
          party: {
            members: [{ handle: participant.handle }],
            teamName: participant.teamName,
            participantType: participant.participantType,
            ghost: false,
          },
          rank: 0, // No rank for out of competition
          points: totalPoints,
          penalty: totalPenalty,
          successfulHackCount: 0,
          unsuccessfulHackCount: 0,
          problemResults: problemResultsWithActualWA,
          customPenalty,
          solvedCount,
        };
      }));

      // Sort out of competition rows by solved count (no ranking)
      outOfCompetitionRows.sort((a, b) => {
        if (a.solvedCount !== b.solvedCount) {
          return b.solvedCount - a.solvedCount;
        }
        return a.customPenalty - b.customPenalty;
      });
    }

    return {
      contest,
      problems,
      rows,
      outOfCompetitionRows,
      firstSolvers,
    };
  }

  private calculateCustomPenalty(
    problemResults: ProblemResult[],
    problems: Problem[],
    ignoredWrongsForUser: Record<string, number>
  ): {
    customPenalty: number;
    solvedCount: number;
    actualWACounts: number[];
  } {
    let customPenalty = 0;
    let solvedCount = 0;
    const actualWACounts: number[] = [];

    problemResults.forEach((result, idx) => {
      let actualWA = result.rejectedAttemptCount || 0;
      const problemIndex = problems[idx]?.index;
      if (problemIndex && ignoredWrongsForUser[problemIndex]) {
        actualWA -= ignoredWrongsForUser[problemIndex];
        if (actualWA < 0) actualWA = 0;
      }
      actualWACounts.push(actualWA);
      if (result.points > 0) {
        solvedCount++;
        if (result.bestSubmissionTimeSeconds) {
          customPenalty += Math.floor(result.bestSubmissionTimeSeconds / 60);
        }
        customPenalty += actualWA * 5;
      }
    });
    return { customPenalty, solvedCount, actualWACounts };
  }

  private signRequest(url: string, apiKey: string, apiSecret: string): string {
    const urlObj = new URL(url);
    const params = new URLSearchParams(urlObj.search);
    const time = Math.floor(Date.now() / 1000);
    const rand = Math.floor(Math.random() * 1000000)
      .toString()
      .padStart(6, "0");
    params.set("apiKey", apiKey);
    params.set("time", time.toString());
    const sortedParams = Array.from(params.entries()).sort();
    const queryString = sortedParams
      .map(([key, value]) => `${key}=${value}`)
      .join("&");
    const methodName = urlObj.pathname.replace("/api/", "");
    const toSign = `${rand}/${methodName}?${queryString}#${apiSecret}`;
    const apiSig = createHash("sha512").update(toSign).digest("hex");
    params.set("apiSig", `${rand}${apiSig}`);
    return `${urlObj.origin}${urlObj.pathname}?${params.toString()}`;
  }

  async getContestStatus(): Promise<Submission[]> {
    try {
      let url = `${this.baseUrl}/contest.status?contestId=${this.contestId}`;
      if (this.groupId) {
        url += `&groupId=${this.groupId}`;
      }
      if (this.apiKey && this.apiSecret) {
        url = this.signRequest(url, this.apiKey, this.apiSecret);
      }
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }
      const data = await response.json();
      if (data.status !== "OK") {
        throw new Error(`API Error: ${data.comment || "Unknown error"}`);
      }
      return data.result;
    } catch (error) {
      console.error("Error fetching contest status:", error);
      throw new Error(
        `Failed to fetch contest status: ${
          error instanceof Error ? error.message : "Unknown error"
        }`
      );
    }
  }

  private async getContestInfo() {
    const CONTEST_NAME = process.env.CONTEST_NAME || "My Private Contest";
    const CONTEST_DURATION_SECONDS = Number(process.env.CONTEST_DURATION_SECONDS) || 7200;
    const CONTEST_START_TIME_SECONDS = Number(process.env.CONTEST_START_TIME_SECONDS) || 0;
    const now = Math.floor(Date.now() / 1000);

    let phase = "BEFORE";
    if (now >= CONTEST_START_TIME_SECONDS + CONTEST_DURATION_SECONDS) {
      phase = "FINISHED";
    } else if (now >= CONTEST_START_TIME_SECONDS) {
      phase = "CODING";
    }

    return {
      id: this.contestId,
      name: CONTEST_NAME,
      type: "ICPC",
      phase,
      durationSeconds: CONTEST_DURATION_SECONDS,
      startTimeSeconds: CONTEST_START_TIME_SECONDS,
    };
  }

  private getFirstSolvers(submissions: Submission[]): { [problemIndex: string]: string } {
    const firstSolvers: { [problemIndex: string]: string } = {};
    const firstSolveTimes: { [problemIndex: string]: number } = {};
    submissions.forEach((submission: Submission) => {
      // Only consider official contestants for first solver calculation
      if (submission.verdict === "OK" && submission.author.participantType === "CONTESTANT") {
        const problemIndex = submission.problem.index;
        const submissionTime = submission.relativeTimeSeconds;
        const participantHandle =
          submission.author.members?.[0]?.handle ||
          submission.author.teamName ||
          "Unknown";
        if (
          !firstSolveTimes[problemIndex] ||
          submissionTime < firstSolveTimes[problemIndex]
        ) {
          firstSolveTimes[problemIndex] = submissionTime;
          firstSolvers[problemIndex] = participantHandle;
        }
      }
    });
    return firstSolvers;
  }
}

export const codeforcesService = new CodeforcesService();
