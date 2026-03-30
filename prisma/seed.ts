import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const THEME_SEED_DATA = [
  {
    key: "miner",
    displayName: "鉱夫",
    description: "コツコツと地道に掘り進める",
    sortOrder: 1,
    items: {
      common: [
        { key: "miner_coal_fragment", name: "石炭のかけら", description: "黒く煤けた小さな破片" },
        { key: "miner_rusted_nail", name: "錆びた釘", description: "使い古された鉄の名残" },
        { key: "miner_old_metal_scrap", name: "古い金属片", description: "用途不明の欠片" },
        { key: "miner_rough_stone", name: "粗削りの石", description: "まだ磨かれていない原石" },
        { key: "miner_gravel", name: "砂利", description: "足元に転がる無数の粒" },
      ],
      rare: [
        { key: "miner_silver_ore", name: "銀鉱石", description: "白い輝きを宿す鉱脈" },
        { key: "miner_fluorite_crystal", name: "蛍石の結晶", description: "淡く光を通す結晶" },
        { key: "miner_ancient_coin", name: "古代の硬貨", description: "掘削中に見つかった古銭" },
      ],
      epic: [{ key: "miner_crimson_ruby", name: "紅蓮のルビー", description: "灼熱のように赤い宝石" }],
    },
  },
  {
    key: "fisher",
    displayName: "漁師",
    description: "静かに好機を待ち、一気に引き上げる",
    sortOrder: 2,
    items: {
      common: [
        { key: "fisher_pebble", name: "小石", description: "波に磨かれた丸い石" },
        { key: "fisher_wet_feather", name: "濡れた羽根", description: "水辺に残された羽" },
        { key: "fisher_driftwood", name: "流木の欠片", description: "潮の流れに乗った木片" },
        { key: "fisher_old_line", name: "古い釣り糸", description: "絡まった細い糸" },
        { key: "fisher_shell", name: "貝殻", description: "波打ち際に残る殻" },
      ],
      rare: [
        { key: "fisher_pearl", name: "真珠", description: "海の奥で育った珠" },
        { key: "fisher_deep_scale", name: "深海の鱗", description: "未知の魚のきらめき" },
        { key: "fisher_glowing_stone", name: "光る石", description: "夜に淡く輝く小石" },
      ],
      epic: [{ key: "fisher_storm_crystal", name: "嵐の結晶", description: "荒波の力を宿す結晶" }],
    },
  },
  {
    key: "collector",
    displayName: "収集家",
    description: "あらゆる成果を丁寧に集めて並べる",
    sortOrder: 3,
    items: {
      common: [
        { key: "collector_old_stamp", name: "古い切手", description: "消印の残る紙片" },
        { key: "collector_rusted_coin", name: "錆びたコイン", description: "時を経た硬貨" },
        { key: "collector_small_pottery", name: "小さな陶器片", description: "欠けた器の一部" },
        { key: "collector_pressed_flower", name: "枯れた押し花", description: "色褪せた花弁" },
        { key: "collector_faded_label", name: "色あせたラベル", description: "文字が薄れた紙札" },
      ],
      rare: [
        { key: "collector_parchment", name: "羊皮紙の断片", description: "古文書の欠片" },
        { key: "collector_antique_key", name: "骨董の鍵", description: "錠前の記憶を持つ鍵" },
        { key: "collector_golden_quill", name: "金のインクの羽根ペン", description: "豪奢な筆記具" },
      ],
      epic: [{ key: "collector_lost_map", name: "失われた地図", description: "行き先不明の古地図" }],
    },
  },
] as const;

type ItemSeed = {
  key: string;
  name: string;
  description: string;
};

async function upsertThemeItems(themeId: string, rarity: "common" | "rare" | "epic", items: readonly ItemSeed[]) {
  const dropWeight = rarity === "common" ? 10 : rarity === "rare" ? 5 : 1;
  const unlockLevel = rarity === "epic" ? 5 : null;

  for (const item of items) {
    const upsertedItem = await prisma.item.upsert({
      where: { key: item.key },
      update: {
        name: item.name,
        rarity,
        description: item.description,
        isActive: true,
      },
      create: {
        key: item.key,
        name: item.name,
        rarity,
        description: item.description,
        isActive: true,
      },
    });

    await prisma.themeItem.upsert({
      where: {
        themeId_itemId: {
          themeId,
          itemId: upsertedItem.id,
        },
      },
      update: {
        dropWeight,
        unlockLevel,
      },
      create: {
        themeId,
        itemId: upsertedItem.id,
        dropWeight,
        unlockLevel,
      },
    });
  }
}

async function main() {
  for (const themeSeed of THEME_SEED_DATA) {
    const theme = await prisma.theme.upsert({
      where: { key: themeSeed.key },
      update: {
        displayName: themeSeed.displayName,
        description: themeSeed.description,
        sortOrder: themeSeed.sortOrder,
        isActive: true,
      },
      create: {
        key: themeSeed.key,
        displayName: themeSeed.displayName,
        description: themeSeed.description,
        sortOrder: themeSeed.sortOrder,
        isActive: true,
      },
    });

    await upsertThemeItems(theme.id, "common", themeSeed.items.common);
    await upsertThemeItems(theme.id, "rare", themeSeed.items.rare);
    await upsertThemeItems(theme.id, "epic", themeSeed.items.epic);
  }
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
