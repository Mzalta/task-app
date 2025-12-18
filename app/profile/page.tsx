"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { CreditCard, LogOut, User, Mail, Calendar, TrendingUp, ArrowLeft } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { LoadingSkeleton } from "@/components/LoadingSkeleton";
import { useSubscription } from "@/hooks/useSubscription";
import { useAuth } from "@/hooks/useAuth";
import { cn } from "@/lib/utils";

export default function Profile() {
  const { user, isLoading, signOut } = useAuth();
  const { session } = useAuth();
  const { manageSubscription } = useSubscription();

  if (isLoading || !user) {
    return (
      <div className="max-w-4xl mx-auto space-y-6">
        <LoadingSkeleton />
      </div>
    );
  }

  const progressPercentage = user.tasks_limit && user.tasks_limit > 0 
    ? Math.round((user.tasks_created / user.tasks_limit) * 100)
    : 0;

  const getPlanBadgeVariant = (plan: string | null) => {
    if (!plan) return "secondary";
    switch (plan.toLowerCase()) {
      case "pro":
        return "default";
      case "premium":
        return "default";
      default:
        return "secondary";
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6 animate-in">
      <div className="flex items-center gap-4">
        <Link href="/dashboard">
          <Button variant="ghost" size="icon" className="h-9 w-9">
            <ArrowLeft className="h-4 w-4" />
            <span className="sr-only">Back to Dashboard</span>
          </Button>
        </Link>
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground">
            Profile Settings
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Manage your account information and subscription
          </p>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card className="transition-all hover:shadow-md">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <div className="rounded-full bg-primary/10 p-2">
                <User className="h-5 w-5 text-primary" />
              </div>
              Personal Information
            </CardTitle>
            <CardDescription>
              Your account details and contact information
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-3">
              <div className="flex items-start gap-3 p-3 rounded-lg bg-muted/30">
                <Mail className="h-4 w-4 text-muted-foreground mt-0.5" />
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium text-muted-foreground mb-1">
                    Email
                  </p>
                  <p className="text-sm font-medium text-foreground truncate">
                    {user.email}
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-3 p-3 rounded-lg bg-muted/30">
                <User className="h-4 w-4 text-muted-foreground mt-0.5" />
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium text-muted-foreground mb-1">
                    Name
                  </p>
                  <p className="text-sm font-medium text-foreground truncate">
                    {user.name || "Not set"}
                  </p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="transition-all hover:shadow-md">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <div className="rounded-full bg-blue-500/10 p-2">
                <TrendingUp className="h-5 w-5 text-blue-600" />
              </div>
              Usage Statistics
            </CardTitle>
            <CardDescription>
              Track your task creation and limits
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-foreground">
                  Tasks Created
                </span>
                <span className="text-sm font-bold text-foreground">
                  {user.tasks_created} / {user.tasks_limit}
                </span>
              </div>
              <div className="w-full bg-muted rounded-full h-2.5 overflow-hidden">
                <div
                  className={cn(
                    "h-2.5 rounded-full transition-all",
                    progressPercentage >= 90 
                      ? "bg-destructive" 
                      : progressPercentage >= 70
                      ? "bg-yellow-500"
                      : "bg-primary"
                  )}
                  style={{ width: `${Math.min(progressPercentage, 100)}%` }}
                />
              </div>
              <p className="text-xs text-muted-foreground">
                {user.tasks_limit ? user.tasks_limit - user.tasks_created : 0} tasks remaining
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card className="transition-all hover:shadow-md">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <div className="rounded-full bg-purple-500/10 p-2">
                  <CreditCard className="h-5 w-5 text-purple-600" />
                </div>
                Subscription Plan
              </CardTitle>
              <CardDescription className="mt-2">
                Manage your subscription and billing
              </CardDescription>
            </div>
            <Badge 
              variant={getPlanBadgeVariant(user.subscription_plan)}
              className="text-sm px-3 py-1"
            >
              {user.subscription_plan}
            </Badge>
          </div>
        </CardHeader>
        <CardContent>
          <Button 
            onClick={() => manageSubscription(session?.access_token)}
            className="w-full sm:w-auto transition-all hover:shadow-sm"
          >
            <CreditCard className="mr-2 h-4 w-4" />
            Manage Subscription
          </Button>
        </CardContent>
      </Card>

      <div className="flex justify-end pt-4 border-t">
        <Button 
          variant="outline" 
          onClick={signOut}
          className="transition-all hover:bg-destructive/10 hover:text-destructive hover:border-destructive"
        >
          <LogOut className="mr-2 h-4 w-4" />
          Sign Out
        </Button>
      </div>
    </div>
  );
}
