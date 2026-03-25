import { NextResponse } from "next/server";
import { getHomeData } from "@/server/services/home-data-service";

export async function GET() {
  try {
    const homeData = await getHomeData();
    return NextResponse.json(homeData);
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { message: "Failed to load home data." },
      { status: 500 },
    );
  }
}
