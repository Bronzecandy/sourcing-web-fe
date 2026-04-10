import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { Search, ChevronLeft, ChevronRight, ArrowUpDown, Star, Users } from "lucide-react";
import { fetchRankings, fetchDates, fetchTags } from "@/services/api";
import { cn, formatNumber } from "@/lib/utils";

export default function Ranking() {
  const navigate = useNavigate();
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [selectedDate, setSelectedDate] = useState("");
  const [selectedTag, setSelectedTag] = useState("");
  const [platform, setPlatform] = useState<"combined" | "android" | "ios">("combined");
  const [sort, setSort] = useState("rank");
  const [order, setOrder] = useState<"asc" | "desc">("asc");
  const limit = 50;

  const { data: dates } = useQuery({ queryKey: ["dates"], queryFn: fetchDates });
  const { data: tags } = useQuery({ queryKey: ["tags"], queryFn: () => fetchTags() });

  const { data: rankings, isLoading } = useQuery({
    queryKey: ["rankings", page, search, selectedDate, selectedTag, platform, sort, order],
    queryFn: () =>
      fetchRankings({
        page, limit,
        search: search || undefined,
        date: selectedDate || undefined,
        tag: selectedTag || undefined,
        platform,
        sort, order,
      }),
  });

  function handleSort(field: string) {
    if (sort === field) setOrder(order === "asc" ? "desc" : "asc");
    else { setSort(field); setOrder("asc"); }
    setPage(1);
  }

  function SortHeader({ field, label }: { field: string; label: string }) {
    return (
      <th
        className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider cursor-pointer hover:text-foreground transition-colors"
        onClick={() => handleSort(field)}
      >
        <div className="flex items-center gap-1">
          {label}
          <ArrowUpDown className={cn("w-3 h-3", sort === field ? "text-primary" : "text-muted-foreground/50")} />
        </div>
      </th>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Top 200 Ranking</h1>
        <p className="text-muted-foreground text-sm mt-1">
          TapTap daily game rankings {rankings?.date && `- ${rankings.date}`}
        </p>
      </div>

      <div className="flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-[200px] max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search games..."
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            className="w-full pl-10 pr-4 py-2 rounded-lg border border-border bg-card text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
          />
        </div>

        <div className="flex rounded-lg border border-border overflow-hidden">
          {(["combined", "android", "ios"] as const).map((p) => (
            <button
              key={p}
              onClick={() => { setPlatform(p); setPage(1); }}
              className={cn(
                "px-4 py-2 text-sm font-medium transition-colors",
                platform === p ? "bg-primary text-primary-foreground" : "bg-card text-muted-foreground hover:bg-muted"
              )}
            >
              {p === "combined" ? "All" : p === "android" ? "Android" : "iOS"}
            </button>
          ))}
        </div>

        <select
          value={selectedDate}
          onChange={(e) => { setSelectedDate(e.target.value); setPage(1); }}
          className="px-3 py-2 rounded-lg border border-border bg-card text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
        >
          <option value="">Latest Date</option>
          {dates?.map((d) => <option key={d} value={d}>{d}</option>)}
        </select>

        <select
          value={selectedTag}
          onChange={(e) => { setSelectedTag(e.target.value); setPage(1); }}
          className="px-3 py-2 rounded-lg border border-border bg-card text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
        >
          <option value="">All Tags</option>
          {tags?.slice(0, 30).map((t) => (
            <option key={t.name} value={t.name}>{t.name} ({t.count})</option>
          ))}
        </select>
      </div>

      <div className="bg-card rounded-xl border border-border overflow-hidden">
        {isLoading ? (
          <div className="flex items-center justify-center h-64">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-muted/50">
                  <tr>
                    <SortHeader field="rank" label="Rank" />
                    <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Game</th>
                    {platform === "combined" && (
                      <>
                        <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Android</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">iOS</th>
                      </>
                    )}
                    <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Tags</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Rating</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                      <div className="flex items-center gap-1"><Users className="w-3 h-3" />Fans</div>
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Reserves</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Reviews</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {rankings?.data.map((item, idx) => {
                    const rank = platform === "combined"
                      ? (rankings.page - 1) * rankings.limit + idx + 1
                      : platform === "android" ? item.androidRank : item.iosRank;
                    return (
                      <tr
                        key={item.appId}
                        className="hover:bg-muted/30 cursor-pointer transition-colors"
                        onClick={() => navigate(`/game/${item.appId}`)}
                      >
                        <td className="px-4 py-3">
                          <span className={cn(
                            "inline-flex items-center justify-center w-8 h-8 rounded-full text-sm font-bold",
                            rank != null && rank <= 3 ? "bg-primary text-primary-foreground"
                              : rank != null && rank <= 10 ? "bg-accent text-accent-foreground"
                                : "bg-muted text-muted-foreground"
                          )}>
                            {rank ?? "-"}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-3">
                            {item.iconUrl ? (
                              <img src={item.iconUrl} alt="" className="w-9 h-9 rounded-lg" referrerPolicy="no-referrer" />
                            ) : (
                              <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-primary/20 to-primary/40 flex items-center justify-center text-xs font-bold text-primary">
                                {item.title.charAt(0)}
                              </div>
                            )}
                            <div>
                              <p className="font-medium text-sm">{item.title}</p>
                              <p className="text-xs text-muted-foreground">ID: {item.appId}</p>
                            </div>
                          </div>
                        </td>
                        {platform === "combined" && (
                          <>
                            <td className="px-4 py-3 text-sm text-muted-foreground">
                              {item.androidRank != null ? `#${item.androidRank}` : "-"}
                            </td>
                            <td className="px-4 py-3 text-sm text-muted-foreground">
                              {item.iosRank != null ? `#${item.iosRank}` : "-"}
                            </td>
                          </>
                        )}
                        <td className="px-4 py-3">
                          <div className="flex flex-wrap gap-1">
                            {item.tags.slice(0, 2).map((tag) => (
                              <span key={tag} className="inline-flex px-2 py-0.5 rounded-full bg-accent text-accent-foreground text-xs">
                                {tag}
                              </span>
                            ))}
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          {item.rating && (
                            <div className="flex items-center gap-1">
                              <Star className="w-3.5 h-3.5 text-yellow-500 fill-yellow-500" />
                              <span className="text-sm font-medium">{item.rating}</span>
                            </div>
                          )}
                        </td>
                        <td className="px-4 py-3 text-sm text-muted-foreground">
                          {item.fansCount != null ? formatNumber(item.fansCount) : "-"}
                        </td>
                        <td className="px-4 py-3 text-sm text-muted-foreground">
                          {item.reserveCount != null ? formatNumber(item.reserveCount) : "-"}
                        </td>
                        <td className="px-4 py-3 text-sm text-muted-foreground">
                          {item.reviewCount != null ? formatNumber(item.reviewCount) : "-"}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {rankings && rankings.totalPages > 1 && (
              <div className="flex items-center justify-between px-4 py-3 border-t border-border">
                <p className="text-sm text-muted-foreground">
                  {(rankings.page - 1) * rankings.limit + 1}-{Math.min(rankings.page * rankings.limit, rankings.total)} of {rankings.total}
                </p>
                <div className="flex items-center gap-2">
                  <button disabled={page === 1} onClick={() => setPage(page - 1)}
                    className="p-2 rounded-lg border border-border hover:bg-muted disabled:opacity-40 disabled:cursor-not-allowed transition-colors">
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                  <span className="text-sm font-medium px-2">{page} / {rankings.totalPages}</span>
                  <button disabled={page === rankings.totalPages} onClick={() => setPage(page + 1)}
                    className="p-2 rounded-lg border border-border hover:bg-muted disabled:opacity-40 disabled:cursor-not-allowed transition-colors">
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
