import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

function PageHeaderSkeleton() {
  return (
    <div className="flex flex-col gap-2">
      <Skeleton className="h-8 w-48" />
      <Skeleton className="h-4 w-full max-w-md" />
    </div>
  );
}

function StatCardsSkeleton() {
  return (
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      {Array.from({ length: 4 }).map((_, index) => (
        <Card key={index}>
          <CardHeader className="flex flex-row items-center justify-between gap-3 pb-2">
            <Skeleton className="h-4 w-28" />
            <Skeleton className="size-8 rounded-full" />
          </CardHeader>
          <CardContent>
            <Skeleton className="h-7 w-20" />
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

export function ContactsLoadingSkeleton() {
  return (
    <div className="space-y-6">
      <PageHeaderSkeleton />
      <StatCardsSkeleton />
      <Card>
        <CardHeader className="gap-3">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <Skeleton className="h-9 w-full max-w-xs" />
            <div className="flex gap-2">
              <Skeleton className="h-9 w-28" />
              <Skeleton className="h-9 w-28" />
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          {Array.from({ length: 8 }).map((_, index) => (
            <div
              key={index}
              className="grid grid-cols-[minmax(180px,1.4fr)_0.7fr_0.8fr_1.2fr_0.8fr_0.4fr] items-center gap-4 rounded-md border p-3"
            >
              <div className="flex items-center gap-3">
                <Skeleton className="size-8 rounded-full" />
                <div className="space-y-2">
                  <Skeleton className="h-4 w-32" />
                  <Skeleton className="h-3 w-24" />
                </div>
              </div>
              <Skeleton className="h-5 w-20" />
              <Skeleton className="h-4 w-24" />
              <div className="space-y-2">
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-3 w-16" />
              </div>
              <Skeleton className="h-5 w-24" />
              <Skeleton className="size-7" />
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}

export function PipelineLoadingSkeleton() {
  return (
    <div className="space-y-6">
      <PageHeaderSkeleton />
      <StatCardsSkeleton />
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
        {Array.from({ length: 5 }).map((_, stageIndex) => (
          <Card key={stageIndex} className="min-h-96">
            <CardHeader className="gap-3">
              <div className="flex items-center justify-between gap-3">
                <Skeleton className="h-5 w-24" />
                <Skeleton className="h-5 w-8 rounded-full" />
              </div>
              <Skeleton className="h-2 w-full" />
            </CardHeader>
            <CardContent className="space-y-3">
              {Array.from({ length: stageIndex === 4 ? 2 : 3 }).map(
                (_, cardIndex) => (
                  <div
                    key={cardIndex}
                    className="space-y-3 rounded-lg border p-3"
                  >
                    <div className="flex items-center gap-3">
                      <Skeleton className="size-8 rounded-full" />
                      <div className="space-y-2">
                        <Skeleton className="h-4 w-28" />
                        <Skeleton className="h-3 w-20" />
                      </div>
                    </div>
                    <Skeleton className="h-3 w-full" />
                    <Skeleton className="h-3 w-3/4" />
                    <div className="flex justify-between gap-2">
                      <Skeleton className="h-5 w-16" />
                      <Skeleton className="h-5 w-20" />
                    </div>
                  </div>
                ),
              )}
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}

export function InboxLoadingSkeleton() {
  return (
    <div className="space-y-6">
      <PageHeaderSkeleton />
      <Card className="overflow-hidden">
        <div className="grid min-h-[640px] lg:grid-cols-[320px_1fr]">
          <div className="border-r p-4">
            <Skeleton className="mb-4 h-9 w-full" />
            <div className="space-y-3">
              {Array.from({ length: 7 }).map((_, index) => (
                <div
                  key={index}
                  className="flex items-center gap-3 rounded-lg border p-3"
                >
                  <Skeleton className="size-10 rounded-full" />
                  <div className="min-w-0 flex-1 space-y-2">
                    <Skeleton className="h-4 w-32" />
                    <Skeleton className="h-3 w-full" />
                  </div>
                </div>
              ))}
            </div>
          </div>
          <div className="flex flex-col p-4">
            <div className="flex items-center gap-3 border-b pb-4">
              <Skeleton className="size-10 rounded-full" />
              <div className="space-y-2">
                <Skeleton className="h-4 w-40" />
                <Skeleton className="h-3 w-28" />
              </div>
            </div>
            <div className="flex-1 space-y-4 py-6">
              {Array.from({ length: 6 }).map((_, index) => (
                <Skeleton
                  key={index}
                  className={`h-12 ${index % 2 === 0 ? "mr-20" : "ml-20"}`}
                />
              ))}
            </div>
            <Skeleton className="h-12 w-full" />
          </div>
        </div>
      </Card>
    </div>
  );
}

export function CrmCardsLoadingSkeleton() {
  return (
    <div className="space-y-6">
      <PageHeaderSkeleton />
      <StatCardsSkeleton />
      <div className="grid gap-4 lg:grid-cols-2">
        {Array.from({ length: 4 }).map((_, index) => (
          <Card key={index}>
            <CardHeader className="gap-2">
              <Skeleton className="h-5 w-36" />
              <Skeleton className="h-4 w-56" />
            </CardHeader>
            <CardContent className="space-y-3">
              <Skeleton className="h-40 w-full" />
              <div className="grid grid-cols-3 gap-3">
                <Skeleton className="h-12" />
                <Skeleton className="h-12" />
                <Skeleton className="h-12" />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
