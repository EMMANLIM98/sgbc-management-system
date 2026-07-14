/**
 * Event Analytics Dashboard Component
 *
 * Real-time attendance metrics and demographic breakdowns.
 * Displays charts and KPI cards.
 */

import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { Card } from "@/components/ui/card";
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import { Users, CheckCircle, TrendingUp, Loader2 } from "lucide-react";
import { getEventAnalytics } from "@/modules/events/events.functions";

export interface EventAnalyticsDashboardProps {
  eventId: string;
}

const COLORS = ["#3B82F6", "#10B981", "#F59E0B", "#EF4444", "#8B5CF6"];

export function EventAnalyticsDashboard({ eventId }: EventAnalyticsDashboardProps) {
  const analyticsFn = useServerFn(getEventAnalytics);

  const { data, isLoading, error } = useQuery({
    queryKey: ["analytics", eventId],
    queryFn: () => analyticsFn({ data: { eventId } }),
    refetchInterval: 30000, // Refresh every 30 seconds
  });

  if (isLoading) {
    return (
      <Card className="p-12 text-center">
        <Loader2 className="w-8 h-8 animate-spin mx-auto mb-2 text-blue-600" />
        <p className="text-gray-600">Loading analytics...</p>
      </Card>
    );
  }

  if (error || !data?.metrics) {
    return (
      <Card className="p-6 bg-red-50 border-red-200">
        <p className="text-red-800">Failed to load analytics</p>
      </Card>
    );
  }

  const metrics = data.metrics;
  const byCategory = data.byCategory || [];
  const byMembership = data.byMembership || [];
  const byLeadership = data.byLeadership || [];
  const byGender = data.byGender || [];
  const hourlyArrivals = data.hourlyArrivals || [];
  const perChurch = data.perChurch || [];

  return (
    <div className="space-y-6">
      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Registered</p>
              <p className="text-2xl font-bold">{metrics.totalRegistered}</p>
            </div>
            <Users className="w-8 h-8 text-blue-600 opacity-20" />
          </div>
        </Card>

        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Checked In</p>
              <p className="text-2xl font-bold">{metrics.totalCheckedIn}</p>
            </div>
            <CheckCircle className="w-8 h-8 text-green-600 opacity-20" />
          </div>
        </Card>

        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Attendance %</p>
              <p className="text-2xl font-bold">{metrics.attendancePercentage.toFixed(0)}%</p>
            </div>
            <TrendingUp className="w-8 h-8 text-purple-600 opacity-20" />
          </div>
        </Card>

        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Remaining</p>
              <p className="text-2xl font-bold">{metrics.remainingAttendees}</p>
            </div>
            <Users className="w-8 h-8 text-yellow-600 opacity-20" />
          </div>
        </Card>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-6 gap-3">
        <Card className="p-3">
          <p className="text-xs text-gray-600">Visitors</p>
          <p className="text-xl font-semibold">{metrics.visitorCount}</p>
        </Card>
        <Card className="p-3">
          <p className="text-xs text-gray-600">Members</p>
          <p className="text-xl font-semibold">{metrics.memberCount}</p>
        </Card>
        <Card className="p-3">
          <p className="text-xs text-gray-600">Children</p>
          <p className="text-xl font-semibold">{metrics.childrenCount}</p>
        </Card>
        <Card className="p-3">
          <p className="text-xs text-gray-600">Youth</p>
          <p className="text-xl font-semibold">{metrics.youthCount}</p>
        </Card>
        <Card className="p-3">
          <p className="text-xs text-gray-600">Adults</p>
          <p className="text-xl font-semibold">{metrics.adultsCount}</p>
        </Card>
        <Card className="p-3">
          <p className="text-xs text-gray-600">Seniors</p>
          <p className="text-xl font-semibold">{metrics.seniorsCount}</p>
        </Card>
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Attendance by Age Category */}
        {byCategory.length > 0 && (
          <Card className="p-4">
            <h3 className="font-semibold mb-4">By Age Category</h3>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={byCategory}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="category" />
                <YAxis />
                <Tooltip />
                <Bar dataKey="count" fill="#3B82F6" name="Count" />
              </BarChart>
            </ResponsiveContainer>
          </Card>
        )}

        {/* Membership Status Pie Chart */}
        {byMembership.length > 0 && (
          <Card className="p-4">
            <h3 className="font-semibold mb-4">By Membership Status</h3>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={byMembership}
                  dataKey="count"
                  nameKey="membership"
                  cx="50%"
                  cy="50%"
                  outerRadius={100}
                  label
                >
                  {byMembership.map((entry: any, index: number) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </Card>
        )}
      </div>

      {byLeadership.length > 0 && (
        <Card className="p-4">
          <h3 className="font-semibold mb-4">Leadership Attendance</h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={byLeadership}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="role" />
              <YAxis />
              <Tooltip />
              <Bar dataKey="count" fill="#8B5CF6" name="Checked In" />
            </BarChart>
          </ResponsiveContainer>
        </Card>
      )}

      {/* Hourly Arrivals */}
      {hourlyArrivals.length > 0 && (
        <Card className="p-4">
          <h3 className="font-semibold mb-4">Check-ins Over Time</h3>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={hourlyArrivals}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="hour" tickFormatter={(hour) => `${hour}:00`} />
              <YAxis />
              <Tooltip labelFormatter={(hour) => `${hour}:00`} />
              <Line
                type="monotone"
                dataKey="count"
                stroke="#10B981"
                strokeWidth={2}
                name="Check-ins"
              />
            </LineChart>
          </ResponsiveContainer>
        </Card>
      )}

      {perChurch.length > 0 && (
        <Card className="p-4">
          <h3 className="font-semibold mb-4">Church Attendance Comparison</h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={perChurch}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="churchName" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Bar dataKey="registrationCount" fill="#94A3B8" name="Registered" />
              <Bar dataKey="checkedInCount" fill="#10B981" name="Checked In" />
            </BarChart>
          </ResponsiveContainer>
        </Card>
      )}

      {/* Gender Breakdown */}
      {byGender.length > 0 && (
        <Card className="p-4">
          <h3 className="font-semibold mb-4">By Gender</h3>
          <div className="space-y-2">
            {byGender.map((entry: any) => (
              <div key={entry.gender} className="flex items-center justify-between">
                <span className="text-sm capitalize text-gray-600">{entry.gender}</span>
                <div className="flex items-center gap-2">
                  <div className="w-32 h-6 bg-gray-200 rounded overflow-hidden">
                    <div className="h-full bg-blue-600" style={{ width: `${entry.percentage}%` }} />
                  </div>
                  <span className="text-sm font-medium w-12 text-right">{entry.percentage}%</span>
                  <span className="text-xs text-gray-500 w-8 text-right">({entry.count})</span>
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}
    </div>
  );
}
