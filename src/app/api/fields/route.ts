import { NextResponse } from "next/server";
import { createFieldForUser } from "@/server/repositories/field-repository";
import { getOrCreateDefaultUser } from "@/server/repositories/user-repository";
import type { CreateFieldRequest } from "@/types/api";

function isCreateFieldRequest(value: unknown): value is CreateFieldRequest {
  if (!value || typeof value !== "object") {
    return false;
  }

  const candidate = value as Record<string, unknown>;
  return (
    typeof candidate.name === "string" &&
    (candidate.theme === "miner" ||
      candidate.theme === "fisher" ||
      candidate.theme === "collector") &&
    typeof candidate.isPublic === "boolean"
  );
}

export async function POST(request: Request) {
  try {
    const body: unknown = await request.json();
    if (!isCreateFieldRequest(body)) {
      return NextResponse.json(
        { message: "Invalid field request." },
        { status: 400 },
      );
    }

    const trimmedName = body.name.trim();
    if (!trimmedName) {
      return NextResponse.json(
        { message: "Field name is required." },
        { status: 400 },
      );
    }

    const user = await getOrCreateDefaultUser();
    const createdField = await createFieldForUser({
      userId: user.id,
      name: trimmedName,
      theme: body.theme,
      isPublic: body.isPublic,
    });

    return NextResponse.json({
      id: createdField.id,
      userId: createdField.userId,
      name: createdField.name,
      theme: createdField.theme,
      isPublic: createdField.isPublic,
    });
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { message: "Failed to create field." },
      { status: 500 },
    );
  }
}
