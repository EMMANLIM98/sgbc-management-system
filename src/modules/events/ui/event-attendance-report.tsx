/**
 * Event Attendance Report Component
 *
 * Comprehensive report showing registered vs checked-in vs no-show attendees.
 * Includes all attendees view with Excel export capability.
 */

import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { getEventRegistrations, getAllEventRegistrations } from "@/modules/events/events.functions";
import { exportRegistrationsToExcel } from "@/lib/excel";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
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
import { AlertCircle, CheckCircle2, Clock, Loader2, Download } from "lucide-react";

interface EventAttendanceReportProps {
  eventId: string;
}

export function EventAttendanceReport({ eventId }: EventAttendanceReportProps) {
  const getRegistrationsFn = useServerFn(getEventRegistrations);
  const getAllRegistrationsFn = useServerFn(getAllEventRegistrations);

  const {
    data: checkedInData,
    isLoading: loadingCheckedIn,
    error: errorCheckedIn,
  } = useQuery({
    queryKey: ["registrations", eventId, "checked_in"],
    queryFn: () =>
      getRegistrationsFn({
        data: {
          eventId,
          status: "checked_in",
          page: 1,
          pageSize: 100,
        },
      }),
    retry: 2,
  });

  const {
    data: registeredData,
    isLoading: loadingRegistered,
    error: errorRegistered,
  } = useQuery({
    queryKey: ["registrations", eventId, "registered"],
    queryFn: () =>
      getRegistrationsFn({
        data: {
          eventId,
          status: "registered",
          page: 1,
          pageSize: 100,
        },
      }),
    retry: 2,
  });

  const {
    data: noShowData,
    isLoading: loadingNoShow,
    error: errorNoShow,
  } = useQuery({
    queryKey: ["registrations", eventId, "no_show"],
    queryFn: () =>
      getRegistrationsFn({
        data: {
          eventId,
          status: "no_show",
          page: 1,
          pageSize: 100,
        },
      }),
    retry: 2,
  });

  const {
    data: allData,
    isLoading: loadingAll,
    error: errorAll,
  } = useQuery({
    queryKey: ["registrations", eventId, "all"],
    queryFn: () =>
      getAllRegistrationsFn({
        data: {
          eventId,
        },
      }),
    retry: 2,
  });

  const checkedInCount = checkedInData?.total || 0;
  const registeredCount = registeredData?.total || 0;
  const noShowCount = noShowData?.total || 0;
  const totalRegistered = checkedInCount + registeredCount + noShowCount;
  const attendanceRate =
    totalRegistered > 0 ? Math.round((checkedInCount / totalRegistered) * 100) : 0;

  const isLoading = loadingCheckedIn || loadingRegistered || loadingNoShow;

  if (isLoading) {
    return (
      <Card className="p-12 text-center border border-gray-200 bg-white shadow-sm\">
        <Loader2 className="w-8 h-8 animate-spin mx-auto mb-2 text-gray-400" />
        <p className="text-gray-600">Loading attendance data...</p>
      </Card>
    );
  }

  if (errorCheckedIn || errorRegistered || errorNoShow) {
    const errorMsg =
      errorCheckedIn?.message ||
      errorRegistered?.message ||
      errorNoShow?.message ||
      "Unknown error";
    console.error("Attendance report error:", { errorCheckedIn, errorRegistered, errorNoShow });
    return (
      <Card className="p-6 border border-gray-200 bg-white">
        <p className="text-gray-900 font-medium mb-1">Failed to load attendance data</p>
        <p className="text-sm text-gray-600 mb-3">Please try again or contact support</p>
        <p className="text-xs text-gray-500 bg-gray-50 p-2 rounded border border-gray-200 font-mono break-all">
          Error: {errorMsg}
        </p>
      </Card>
    );
  }

  const handleExportAllAttendees = () => {
    if (!allData?.registrations) return;
    const now = new Date().toISOString().split("T")[0];
    exportRegistrationsToExcel(`event-attendees-${now}.xlsx`, allData.registrations);
  };

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="p-6 border border-gray-200 bg-white shadow-sm">
          <p className="text-sm font-medium text-gray-600">Checked In</p>
          <p className="text-3xl font-bold text-gray-900 mt-2">{checkedInCount}</p>
          <p className="text-xs text-gray-500 mt-2">Attended</p>
        </Card>

        <Card className="p-6 border border-gray-200 bg-white shadow-sm">
          <p className="text-sm font-medium text-gray-600">Still Registered</p>
          <p className="text-3xl font-bold text-gray-900 mt-2">{registeredCount}</p>
          <p className="text-xs text-gray-500 mt-2">Not yet checked in</p>
        </Card>

        <Card className="p-6 border border-gray-200 bg-white shadow-sm">
          <p className="text-sm font-medium text-gray-600">No-Show</p>
          <p className="text-3xl font-bold text-gray-900 mt-2">{noShowCount}</p>
          <p className="text-xs text-gray-500 mt-2">Did not attend</p>
        </Card>

        <Card className="p-6 border border-gray-200 bg-white shadow-sm">
          <p className="text-sm font-medium text-gray-600">Attendance Rate</p>
          <p className="text-3xl font-bold text-gray-900 mt-2">{attendanceRate}%</p>
          <p className="text-xs text-gray-500 mt-2">
            {checkedInCount} of {totalRegistered}
          </p>
        </Card>
      </div>

      {/* Detailed Tables */}
      <Card className="border border-gray-200 bg-white shadow-sm overflow-hidden">
        <Tabs defaultValue="all_attendees" className="w-full">
          <TabsList className="w-full justify-start rounded-none border-b border-gray-200 bg-white p-0 h-auto">
            <TabsTrigger
              value="all_attendees"
              className="rounded-none border-b-2 border-b-transparent text-gray-700"
            >
              <CheckCircle2 className="w-4 h-4 mr-2 text-gray-600" />
              All Attendees ({allData?.total || 0})
            </TabsTrigger>
            <TabsTrigger
              value="checked_in"
              className="rounded-none border-b-2 border-b-transparent text-gray-700"
            >
              <CheckCircle2 className="w-4 h-4 mr-2 text-gray-600" />
              Checked In ({checkedInCount})
            </TabsTrigger>
            <TabsTrigger
              value="registered"
              className="rounded-none border-b-2 border-b-transparent text-gray-700"
            >
              <Clock className="w-4 h-4 mr-2 text-gray-600" />
              Registered ({registeredCount})
            </TabsTrigger>
            <TabsTrigger
              value="no_show"
              className="rounded-none border-b-2 border-b-transparent text-gray-700"
            >
              <AlertCircle className="w-4 h-4 mr-2 text-gray-600" />
              No-Show ({noShowCount})
            </TabsTrigger>
          </TabsList>

          <TabsContent value="all_attendees" className="p-0">
            <AllAttendeesTable
              data={allData?.registrations || []}
              isLoading={loadingAll}
              onExport={handleExportAllAttendees}
            />
          </TabsContent>

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
  const getStatusBadge = (status: string) => {
    switch (status) {
      case "checked_in":
        return (
          <Badge
            variant="outline"
            className="bg-gray-100 text-gray-700 border-gray-200 flex items-center gap-1 w-fit font-normal"
          >
            <CheckCircle2 className="w-3 h-3" />
            Checked In
          </Badge>
        );
      case "registered":
        return (
          <Badge
            variant="outline"
            className="bg-gray-100 text-gray-700 border-gray-200 flex items-center gap-1 w-fit font-normal"
          >
            <Clock className="w-3 h-3" />
            Registered
          </Badge>
        );
      case "no_show":
        return (
          <Badge
            variant="outline"
            className="bg-gray-100 text-gray-700 border-gray-200 flex items-center gap-1 w-fit font-normal"
          >
            <AlertCircle className="w-3 h-3" />
            No-Show
          </Badge>
        );
      default:
        return null;
    }
  };

  return (
    <div className="overflow-x-auto p-6">
      {isLoading ? (
        <div className="flex justify-center items-center h-32">
          <Loader2 className="w-5 h-5 animate-spin text-gray-400 mr-2" />
          <p className="text-gray-500">Loading...</p>
        </div>
      ) : data.length === 0 ? (
        <div className="text-center py-8">
          <p className="text-gray-500 text-sm">No attendees in this category</p>
        </div>
      ) : (
        <Table>
          <TableHeader>
            <TableRow className="bg-gray-50 border-b border-gray-200">
              <TableHead className="font-semibold text-gray-900">Name</TableHead>
              <TableHead className="font-semibold text-gray-900">Email</TableHead>
              <TableHead className="font-semibold text-gray-900">Phone</TableHead>
              <TableHead className="font-semibold text-gray-900">Age Category</TableHead>
              <TableHead className="font-semibold text-gray-900">Visitor Status</TableHead>
              <TableHead className="text-center font-semibold text-gray-900">Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {data.map((registration) => (
              <TableRow
                key={registration.id}
                className="border-b border-gray-100 hover:bg-gray-50 transition-colors"
              >
                <TableCell className="font-medium text-gray-900">{registration.name}</TableCell>
                <TableCell className="text-sm text-gray-600">{registration.email || "—"}</TableCell>
                <TableCell className="text-sm text-gray-600">{registration.phone || "—"}</TableCell>
                <TableCell>
                  {registration.ageCategory ? (
                    <Badge
                      variant="outline"
                      className="bg-gray-100 text-gray-700 border-gray-200 capitalize font-normal"
                    >
                      {registration.ageCategory.replace("_", " ")}
                    </Badge>
                  ) : (
                    <span className="text-gray-400 text-sm">—</span>
                  )}
                </TableCell>
                <TableCell>
                  {registration.visitorStatus ? (
                    <Badge
                      variant="outline"
                      className="bg-gray-100 text-gray-700 border-gray-200 capitalize font-normal"
                    >
                      {registration.visitorStatus.replace("_", " ")}
                    </Badge>
                  ) : (
                    <span className="text-gray-400 text-sm">—</span>
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

interface AllAttendeesTableProps {
  data: any[];
  isLoading: boolean;
  onExport: () => void;
}

function AllAttendeesTable({ data, isLoading, onExport }: AllAttendeesTableProps) {
  const getStatusBadge = (status: string) => {
    switch (status) {
      case "checked_in":
        return (
          <Badge
            variant="outline"
            className="bg-green-50 text-green-700 border-green-200 flex items-center gap-1 w-fit font-normal"
          >
            <CheckCircle2 className="w-3 h-3" />
            Checked In
          </Badge>
        );
      case "registered":
        return (
          <Badge
            variant="outline"
            className="bg-blue-50 text-blue-700 border-blue-200 flex items-center gap-1 w-fit font-normal"
          >
            <Clock className="w-3 h-3" />
            Registered
          </Badge>
        );
      case "no_show":
        return (
          <Badge
            variant="outline"
            className="bg-red-50 text-red-700 border-red-200 flex items-center gap-1 w-fit font-normal"
          >
            <AlertCircle className="w-3 h-3" />
            No-Show
          </Badge>
        );
      default:
        return null;
    }
  };

  return (
    <div className="p-6 space-y-4">
      <div className="flex justify-between items-center">
        <p className="text-sm text-gray-600">
          Total: <span className="font-semibold text-gray-900">{data.length} attendees</span>
        </p>
        <Button
          onClick={onExport}
          disabled={isLoading || data.length === 0}
          className="bg-gray-900 hover:bg-gray-800 text-white"
        >
          <Download className="w-4 h-4 mr-2" />
          Export to Excel
        </Button>
      </div>

      <div className="overflow-x-auto border border-gray-200 rounded-lg">
        {isLoading ? (
          <div className="flex justify-center items-center h-32">
            <Loader2 className="w-5 h-5 animate-spin text-gray-400 mr-2" />
            <p className="text-gray-500">Loading...</p>
          </div>
        ) : data.length === 0 ? (
          <div className="text-center py-8">
            <p className="text-gray-500 text-sm">No attendees registered for this event</p>
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow className="bg-gray-50 border-b border-gray-200">
                <TableHead className="font-semibold text-gray-900">Name</TableHead>
                <TableHead className="font-semibold text-gray-900">Email</TableHead>
                <TableHead className="font-semibold text-gray-900">Phone</TableHead>
                <TableHead className="font-semibold text-gray-900">Age Category</TableHead>
                <TableHead className="font-semibold text-gray-900">Gender</TableHead>
                <TableHead className="font-semibold text-gray-900">Visitor Status</TableHead>
                <TableHead className="font-semibold text-gray-900">Leadership Role</TableHead>
                <TableHead className="text-center font-semibold text-gray-900">Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.map((registration) => (
                <TableRow
                  key={registration.id}
                  className="border-b border-gray-100 hover:bg-gray-50 transition-colors"
                >
                  <TableCell className="font-medium text-gray-900">{registration.name}</TableCell>
                  <TableCell className="text-sm text-gray-600">
                    {registration.email || "—"}
                  </TableCell>
                  <TableCell className="text-sm text-gray-600">
                    {registration.phone || "—"}
                  </TableCell>
                  <TableCell>
                    {registration.ageCategory ? (
                      <Badge
                        variant="outline"
                        className="bg-gray-100 text-gray-700 border-gray-200 capitalize font-normal"
                      >
                        {registration.ageCategory.replace("_", " ")}
                      </Badge>
                    ) : (
                      <span className="text-gray-400 text-sm">—</span>
                    )}
                  </TableCell>
                  <TableCell className="text-sm text-gray-600">
                    {registration.sex ? (registration.sex === "male" ? "Male" : "Female") : "—"}
                  </TableCell>
                  <TableCell>
                    {registration.visitorStatus ? (
                      <Badge
                        variant="outline"
                        className="bg-gray-100 text-gray-700 border-gray-200 capitalize font-normal"
                      >
                        {registration.visitorStatus.replace("_", " ")}
                      </Badge>
                    ) : (
                      <span className="text-gray-400 text-sm">—</span>
                    )}
                  </TableCell>
                  <TableCell className="text-sm text-gray-600">
                    {registration.leadershipRole
                      ? registration.leadershipRole.replace("_", " ")
                      : "—"}
                  </TableCell>
                  <TableCell className="text-center">
                    {getStatusBadge(registration.status)}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </div>
    </div>
  );
}
