/**
 * Event Attendance Report Component
 *
 * Comprehensive report showing registered vs checked-in vs no-show attendees.
 */

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { getEventRegistrations } from "@/modules/events/events.functions";
import { Card } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { AlertCircle, CheckCircle2, Clock, Loader2 } from "lucide-react";

interface EventAttendanceReportProps {
  eventId: string;
}

export function EventAttendanceReport({ eventId }: EventAttendanceReportProps) {
  const [expandedTab, setExpandedTab] = useState<"checked_in" | "registered" | "no_show">(
    "checked_in",
  );

  const getRegistrationsFn = useServerFn(getEventRegistrations);

  const { data: checkedInData, isLoading: loadingCheckedIn } = useQuery({
    queryKey: ["registrations", eventId, "checked_in"],
    queryFn: () =>
      getRegistrationsFn({
        data: {
          eventId,
          status: "checked_in",
          page: 1,
          pageSize: 1000,
        },
      }),
  });

  const { data: registeredData, isLoading: loadingRegistered } = useQuery({
    queryKey: ["registrations", eventId, "registered"],
    queryFn: () =>
      getRegistrationsFn({
        data: {
          eventId,
          status: "registered",
          page: 1,
          pageSize: 1000,
        },
      }),
  });

  const { data: noShowData, isLoading: loadingNoShow } = useQuery({
    queryKey: ["registrations", eventId, "no_show"],
    queryFn: () =>
      getRegistrationsFn({
        data: {
          eventId,
          status: "no_show",
          page: 1,
          pageSize: 1000,
        },
      }),
  });

  const checkedInCount = checkedInData?.total || 0;
  const registeredCount = registeredData?.total || 0;
  const noShowCount = noShowData?.total || 0;
  const totalRegistered = checkedInCount + registeredCount + noShowCount;
  const attendanceRate =
    totalRegistered > 0 ? Math.round((checkedInCount / totalRegistered) * 100) : 0;

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="p-4 border-l-4 border-l-green-500">
          <p className="text-sm text-gray-600 font-medium">Checked In</p>
          <p className="text-3xl font-bold text-green-600">{checkedInCount}</p>
          <p className="text-xs text-gray-500 mt-1">Attended</p>
        </Card>

        <Card className="p-4 border-l-4 border-l-blue-500">
          <p className="text-sm text-gray-600 font-medium">Still Registered</p>
          <p className="text-3xl font-bold text-blue-600">{registeredCount}</p>
          <p className="text-xs text-gray-500 mt-1">Not yet checked in</p>
        </Card>

        <Card className="p-4 border-l-4 border-l-red-500">
          <p className="text-sm text-gray-600 font-medium">No-Show</p>
          <p className="text-3xl font-bold text-red-600">{noShowCount}</p>
          <p className="text-xs text-gray-500 mt-1">Did not attend</p>
        </Card>

        <Card className="p-4 border-l-4 border-l-purple-500">
          <p className="text-sm text-gray-600 font-medium">Attendance Rate</p>
          <p className="text-3xl font-bold text-purple-600">{attendanceRate}%</p>
          <p className="text-xs text-gray-500 mt-1">
            {checkedInCount} of {totalRegistered}
          </p>
        </Card>
      </div>

      {/* Detailed Tables */}
      <Card className="overflow-hidden">
        <Tabs defaultValue="checked_in" className="w-full">
          <TabsList className="w-full justify-start rounded-none border-b bg-white p-0 h-auto">
            <TabsTrigger value="checked_in" className="rounded-none border-b-2 border-b-transparent">
              <CheckCircle2 className="w-4 h-4 mr-2 text-green-600" />
              Checked In ({checkedInCount})
            </TabsTrigger>
            <TabsTrigger value="registered" className="rounded-none border-b-2 border-b-transparent">
              <Clock className="w-4 h-4 mr-2 text-blue-600" />
              Registered ({registeredCount})
            </TabsTrigger>
            <TabsTrigger value="no_show" className="rounded-none border-b-2 border-b-transparent">
              <AlertCircle className="w-4 h-4 mr-2 text-red-600" />
              No-Show ({noShowCount})
            </TabsTrigger>
          </TabsList>

          <TabsContent value="checked_in" className="p-0">
            <AttendanceTable
              data={checkedInData?.registrations || []}
              isLoading={loadingCheckedIn}
              status="checked_in"
            />
          </TabsContent>

          <TabsContent value="registered" className="p-0">
            <AttendanceTable
              data={registeredData?.registrations || []}
              isLoading={loadingRegistered}
              status="registered"
            />
          </TabsContent>

          <TabsContent value="no_show" className="p-0">
            <AttendanceTable
              data={noShowData?.registrations || []}
              isLoading={loadingNoShow}
              status="no_show"
            />
          </TabsContent>
        </Tabs>
      </Card>
    </div>
  );
}

interface AttendanceTableProps {
  data: any[];
  isLoading: boolean;
  status: "checked_in" | "registered" | "no_show";
}

function AttendanceTable({ data, isLoading, status }: AttendanceTableProps) {
  const getStatusColor = (status: string) => {
    switch (status) {
      case "checked_in":
        return "bg-green-50 border-green-200";
      case "registered":
        return "bg-blue-50 border-blue-200";
      case "no_show":
        return "bg-red-50 border-red-200";
      default:
        return "";
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "checked_in":
        return (
          <Badge className="bg-green-100 text-green-800 hover:bg-green-100 flex items-center gap-1 w-fit">
            <CheckCircle2 className="w-3 h-3" />
            Checked In
          </Badge>
        );
      case "registered":
        return (
          <Badge className="bg-blue-100 text-blue-800 hover:bg-blue-100 flex items-center gap-1 w-fit">
            <Clock className="w-3 h-3" />
            Registered
          </Badge>
        );
      case "no_show":
        return (
          <Badge className="bg-red-100 text-red-800 hover:bg-red-100 flex items-center gap-1 w-fit">
            <AlertCircle className="w-3 h-3" />
            No-Show
          </Badge>
        );
      default:
        return null;
    }
  };

  return (
    <div className={`overflow-x-auto p-6 ${getStatusColor(status)}`}>
      {isLoading ? (
        <div className="flex justify-center items-center h-32">
          <Loader2 className="w-5 h-5 animate-spin text-gray-400 mr-2" />
          <p className="text-gray-500">Loading...</p>
        </div>
      ) : data.length === 0 ? (
        <div className="text-center py-8">
          <p className="text-gray-500">No attendees in this category</p>
        </div>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="font-semibold">Name</TableHead>
              <TableHead className="font-semibold">Email</TableHead>
              <TableHead className="font-semibold">Phone</TableHead>
              <TableHead className="font-semibold">Age Category</TableHead>
              <TableHead className="font-semibold">Visitor Status</TableHead>
              <TableHead className="text-center">Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {data.map((registration) => (
              <TableRow key={registration.id}>
                <TableCell className="font-medium">{registration.name}</TableCell>
                <TableCell className="text-sm text-gray-600">{registration.email || "-"}</TableCell>
                <TableCell className="text-sm text-gray-600">{registration.phone || "-"}</TableCell>
                <TableCell>
                  {registration.ageCategory ? (
                    <Badge variant="outline" className="capitalize">
                      {registration.ageCategory.replace("_", " ")}
                    </Badge>
                  ) : (
                    <span className="text-gray-400 text-sm">-</span>
                  )}
                </TableCell>
                <TableCell>
                  {registration.visitorStatus ? (
                    <Badge
                      variant={
                        registration.visitorStatus === "member" ? "default" : "secondary"
                      }
                      className="capitalize"
                    >
                      {registration.visitorStatus.replace("_", " ")}
                    </Badge>
                  ) : (
                    <span className="text-gray-400 text-sm">-</span>
                  )}
                </TableCell>
                <TableCell className="text-center">{getStatusBadge(registration.status)}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </div>
  );
}
