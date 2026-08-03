import { riotApi, regionToCluster } from "./riotApi.js";

const cache = new Map();
const CACHE_TTL = 5 * 60 * 1000; // 5 минут

function parsePlayerData(playerData) {
  const parts = decodeURIComponent(playerData).split("-");
  const regionKey = parts.pop(); // RU
  const tagLine = parts.pop(); // RU1
  const gameName = parts.join("-").replace(/_/g, " "); // MishaCrazy

  const { cluster, region: regionUrl } = regionToCluster[regionKey];
  return { gameName, tagLine, cluster, regionUrl };
}

export async function loadPlayer(playerData) {
  const cached = cache.get(playerData);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    return cached.data;
  }

  const { gameName, tagLine, cluster, regionUrl } = parsePlayerData(playerData);

  const [version, account] = await Promise.all([
    riotApi.getVersion(),
    riotApi.getPuuidByNameTag(gameName, tagLine, cluster),
  ]);

  // 3. Загружаем всё остальное параллельно
  const [sumData, rank, matchIds, masteries, champions, itemsResponse] =
    await Promise.all([
      riotApi.getSummonerLevel(account.puuid, regionUrl),
      riotApi.getRank(account.puuid, regionUrl),
      riotApi.getRecentMatch(account.puuid, cluster),
      riotApi.getChampMasteries(account.puuid, regionUrl),
      riotApi.getChampions(version),
      riotApi.getItemsInfo(version),
    ]);

  // 4. Детальная инфа о последних 5 матчах
  const matchDetails = await Promise.all(
    matchIds.slice(0, 5).map((id) => riotApi.getMatchInfo(id, cluster)),
  );
  const result = {
    account,
    sumData,
    rank,
    masteries,
    champions,
    version,
    matches: matchDetails,
    items: itemsResponse,
  };

  cache.set(playerData, { data: result, timestamp: Date.now() });
  return result;
}

export async function getLiveGame(playerData) {
  const { gameName, tagLine, cluster, regionUrl } = parsePlayerData(playerData);

  const account = await riotApi.getPuuidByNameTag(gameName, tagLine, cluster);

  return await riotApi.getLiveGame(account.puuid, regionUrl);
}
