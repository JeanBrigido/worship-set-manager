import { PageHeader } from '@/components/layout/page-header';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Music, Calendar, Users, BarChart3 } from 'lucide-react';
import Link from 'next/link';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';

export default async function Home() {
  const session = await getServerSession(authOptions);
  return (
    <div className="space-y-6">
      <PageHeader
        title="Welcome to Worship Set Manager"
        description="Streamline your church&apos;s worship experience with modern tools for song management, set planning, and team coordination."
      />

      {/* Feature Cards */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        <Card className="hover:shadow-md transition-shadow">
          <CardHeader className="pb-4">
            <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center mb-2">
              <Music className="h-6 w-6 text-primary" />
            </div>
            <CardTitle className="text-lg">Song Management</CardTitle>
            <CardDescription>
              Organize and manage your church&apos;s worship songs and hymns with ease.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button variant="outline" size="sm" asChild>
              <Link href="/songs">Browse Songs</Link>
            </Button>
          </CardContent>
        </Card>

        <Card className="hover:shadow-md transition-shadow">
          <CardHeader className="pb-4">
            <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center mb-2">
              <Calendar className="h-6 w-6 text-primary" />
            </div>
            <CardTitle className="text-lg">Set Planning</CardTitle>
            <CardDescription>
              Create and schedule worship sets for services and special events.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button variant="outline" size="sm" asChild>
              <Link href="/services">View Services</Link>
            </Button>
          </CardContent>
        </Card>

        <Card className="hover:shadow-md transition-shadow">
          <CardHeader className="pb-4">
            <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center mb-2">
              <Users className="h-6 w-6 text-primary" />
            </div>
            <CardTitle className="text-lg">Team Coordination</CardTitle>
            <CardDescription>
              Coordinate with musicians and worship team members seamlessly.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button variant="outline" size="sm" asChild>
              <Link href="/assignments">View Assignments</Link>
            </Button>
          </CardContent>
        </Card>

        <Card className="hover:shadow-md transition-shadow">
          <CardHeader className="pb-4">
            <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center mb-2">
              <BarChart3 className="h-6 w-6 text-primary" />
            </div>
            <CardTitle className="text-lg">Analytics</CardTitle>
            <CardDescription>
              Track song usage and worship metrics to enhance your ministry.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button variant="outline" size="sm" disabled>
              Coming Soon
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions */}
      <Card>
        <CardHeader>
          <CardTitle>Quick Actions</CardTitle>
          <CardDescription>
            Get started with common tasks
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-3">
          {/* Role-based quick actions */}
          {((session?.user as any)?.roles?.includes('admin') || (session?.user as any)?.roles?.includes('leader')) && (
            <>
              <Button asChild>
                <Link href="/services/new">Create New Service</Link>
              </Button>
              <Button variant="outline" asChild>
                <Link href="/songs/new">Add New Song</Link>
              </Button>
            </>
          )}
          <Button variant="outline" asChild>
            <Link href="/assignments">View Assignments</Link>
          </Button>
        </CardContent>
      </Card>

      {/* Development-only debug tools */}
      {process.env.NODE_ENV === 'development' && (
        <div className="space-y-6 border-t pt-6 mt-12">
          <div className="text-sm text-muted-foreground">Development Tools (hidden in production)</div>
          {/* Uncomment below to show debug components in development */}
          {/* <ReactQueryTest /> */}
          {/* <ApiTest /> */}
          {/* {(session?.user as any)?.roles?.includes('admin') && <UsersList />} */}
        </div>
      )}
    </div>
  );
}
