import { useState, useEffect } from 'react';
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { LucideIcon } from "lucide-react";

interface DynamicStatsCardProps {
  title: string;
  icon: LucideIcon;
  query: () => Promise<{ value: number; trend?: number; subtitle?: string }>;
  refreshInterval?: number;
  className?: string;
}

const DynamicStatsCard = ({ 
  title, 
  icon: Icon, 
  query, 
  refreshInterval = 30000,
  className = ""
}: DynamicStatsCardProps) => {
  const [data, setData] = useState<{ value: number; trend?: number; subtitle?: string } | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const result = await query();
        setData(result);
      } catch (error) {
        console.error(`Error fetching data for ${title}:`, error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
    const interval = setInterval(fetchData, refreshInterval);
    return () => clearInterval(interval);
  }, [query, refreshInterval, title]);

  if (loading) {
    return (
      <Card className={className}>
        <CardContent className="p-6">
          <div className="flex items-center justify-between">
            <div className="space-y-2">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-8 w-16" />
            </div>
            <Skeleton className="h-8 w-8 rounded-full" />
          </div>
          <Skeleton className="h-3 w-32 mt-2" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={className}>
      <CardContent className="p-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-muted-foreground text-sm">{title}</p>
            <p className="text-2xl font-bold">{data?.value || 0}</p>
          </div>
          <Icon className="w-8 h-8 text-primary" />
        </div>
        {(data?.trend !== undefined || data?.subtitle) && (
          <div className="flex items-center gap-1 mt-2 text-sm">
            {data.trend !== undefined && (
              <>
                <span className={data.trend >= 0 ? "text-success" : "text-destructive"}>
                  {data.trend >= 0 ? "+" : ""}{data.trend}
                </span>
                <span className="text-muted-foreground">vs last period</span>
              </>
            )}
            {data.subtitle && (
              <span className="text-muted-foreground">{data.subtitle}</span>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default DynamicStatsCard;