"use client";

import { useState } from "react";
import { BarChart3, History, TableIcon } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useTankHistory } from "@/hooks/use-tank-history";
import { RANGE_LABEL } from "@/lib/validation";
import { cn } from "@/lib/utils";
import type { HistoryRange } from "@/types";
import { HistoryChart } from "./history-chart";
import { ReadingsTable } from "./readings-table";

const RANGES: HistoryRange[] = ["1h", "6h", "24h", "7d"];

/** Historial: grafico escalonado de estados y tabla de lecturas de sensores. */
export function HistorySection({ version }: { version: number }) {
  const [range, setRange] = useState<HistoryRange>("1h");
  const { readings, loading } = useTankHistory(range, version);

  return (
    <Card className="gap-0 overflow-hidden py-0">
      <CardHeader className="flex flex-col gap-3 border-b border-border/70 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
        <CardTitle className="flex items-center gap-2 text-sm font-semibold tracking-[0.14em]">
          <History className="size-4 text-muted-foreground" />
          HISTORIAL
          <span className="font-mono text-[11px] font-normal tracking-normal text-muted-foreground">
            {loading ? "cargando..." : `${readings.length} lecturas`}
          </span>
        </CardTitle>

        <div className="flex gap-1 rounded-lg border border-border bg-muted/50 p-0.5">
          {RANGES.map((option) => (
            <button
              key={option}
              type="button"
              onClick={() => setRange(option)}
              title={RANGE_LABEL[option]}
              className={cn(
                "rounded-md px-2.5 py-1 text-xs font-medium transition-colors",
                range === option
                  ? "bg-card text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              {option}
            </button>
          ))}
        </div>
      </CardHeader>

      <CardContent className="p-0">
        <Tabs defaultValue="chart">
          <div className="flex items-center justify-between border-b border-border/70 px-5 py-2.5">
            <TabsList>
              <TabsTrigger value="chart" className="gap-1.5 text-xs">
                <BarChart3 className="size-3.5" />
                Evolucion de estados
              </TabsTrigger>
              <TabsTrigger value="table" className="gap-1.5 text-xs">
                <TableIcon className="size-3.5" />
                Lecturas de sensores
              </TabsTrigger>
            </TabsList>
            <p className="hidden text-xs text-muted-foreground md:block">
              {RANGE_LABEL[range]}
            </p>
          </div>

          <TabsContent value="chart" className="p-4">
            <HistoryChart readings={readings} range={range} />
          </TabsContent>

          <TabsContent value="table" className="p-0">
            <ReadingsTable readings={readings} />
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}
