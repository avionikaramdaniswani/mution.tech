import { useListActivity } from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatDistanceToNow } from "date-fns";
import { Activity as ActivityIcon, Settings, Terminal, Play, Square, Database, Box } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

export default function ActivityLog() {
  const { data: activities, isLoading } = useListActivity();

  const getIconForAction = (action: string) => {
    if (action.includes('deploy')) return <Terminal className="h-4 w-4" />;
    if (action.includes('start') || action.includes('run')) return <Play className="h-4 w-4" />;
    if (action.includes('stop')) return <Square className="h-4 w-4" />;
    if (action.includes('db') || action.includes('database')) return <Database className="h-4 w-4" />;
    if (action.includes('project')) return <Box className="h-4 w-4" />;
    return <Settings className="h-4 w-4" />;
  };

  if (isLoading) {
    return (
      <div className="space-y-6 max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold tracking-tight">Activity Log</h1>
        <Card>
          <CardContent className="p-6 space-y-6">
            {Array(6).fill(0).map((_, i) => (
              <div key={i} className="flex gap-4">
                <Skeleton className="h-8 w-8 rounded-full" />
                <div className="space-y-2 flex-1">
                  <Skeleton className="h-4 w-3/4" />
                  <Skeleton className="h-3 w-1/4" />
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Activity Log</h1>
          <p className="text-muted-foreground mt-1">Recent events across all your projects.</p>
        </div>
      </div>

      <Card className="border-border/50">
        <CardContent className="p-0">
          {!activities || activities.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <ActivityIcon className="h-10 w-10 text-muted-foreground mb-4 opacity-50" />
              <p className="text-muted-foreground">No activity recorded yet.</p>
            </div>
          ) : (
            <div className="divide-y divide-border/50">
              {activities.map((activity) => (
                <div key={activity.id} className="p-6 flex gap-4 hover:bg-muted/30 transition-colors">
                  <div className="mt-1 rounded-full bg-primary/10 p-2 h-fit text-primary">
                    {getIconForAction(activity.action)}
                  </div>
                  <div className="flex-1 space-y-1">
                    <p className="text-sm font-medium leading-none flex items-center gap-2">
                      <span className="capitalize">{activity.action.replace(/_/g, ' ')}</span>
                      {activity.projectName && (
                        <span className="text-muted-foreground font-normal">
                          on <span className="text-foreground font-medium">{activity.projectName}</span>
                        </span>
                      )}
                    </p>
                    {activity.metadata && (
                      <p className="text-sm text-muted-foreground">
                        {activity.metadata}
                      </p>
                    )}
                    <p className="text-xs text-muted-foreground pt-1">
                      {formatDistanceToNow(new Date(activity.createdAt), { addSuffix: true })}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}