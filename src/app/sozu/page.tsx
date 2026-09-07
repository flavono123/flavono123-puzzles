import { redirect } from "next/navigation";
import SozuLanding from "./landing";
import { parseStageParam } from "@/games/sozu/copy";

function one(value: string | string[] | undefined): string | null {
  if (Array.isArray(value)) return value[0] ?? null;
  return value ?? null;
}

export default async function SozuIndexPage(props: PageProps<"/sozu">) {
  const query = await props.searchParams;
  const fromQuery = parseStageParam(one(query.stage)) ?? parseStageParam(one(query.s));
  if (fromQuery) redirect(`/sozu/${fromQuery}`);
  return <SozuLanding />;
}
