import { codeforcesService } from "@/services/codeforces";
import { NextResponse, NextRequest } from "next/server";

export async function GET(req: NextRequest) {
  const API_KEY = process.env.API_KEY;
  const API_SECRET = process.env.API_SECRET;
  const CONTEST_ID = Number(process.env.CONTEST_ID);
  const GROUP_ID = process.env.GROUP_ID;

  const standings = await codeforcesService.getContestStandings(
    CONTEST_ID,
    GROUP_ID,
    API_KEY,
    API_SECRET
  );

  return NextResponse.json(standings);
}
