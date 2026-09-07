import { notFound } from "next/navigation";
import type { Metadata } from "next";
import SozuGame from "@/games/sozu/SozuGame";
import { parseStageParam } from "@/games/sozu/copy";
import { STAGES } from "@/games/sozu/stages";

export function generateStaticParams() {
  return STAGES.map((stage) => ({ stage: String(stage.id) }));
}

export async function generateMetadata(props: PageProps<"/sozu/[stage]">): Promise<Metadata> {
  const { stage } = await props.params;
  const id = parseStageParam(stage);
  if (!id || id > STAGES.length) {
    return { title: "시시오도시" };
  }
  return {
    title: `시시오도시 ${id}번 정원`,
    description: "샘물을 가케히로 연못까지. 시시오도시는 탁, 사슴은 달아나요.",
  };
}

export default async function SozuStagePage(props: PageProps<"/sozu/[stage]">) {
  const { stage } = await props.params;
  const id = parseStageParam(stage);
  if (!id || id > STAGES.length) notFound();
  return <SozuGame wantedStage={id} />;
}
