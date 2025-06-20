import { codeforcesService } from "@/services/codeforces";
import { NextResponse, NextRequest } from "next/server";

export async function GET(req: NextRequest) {
  const standings = await codeforcesService.getContestStandings();

  return NextResponse.json(standings);
}
