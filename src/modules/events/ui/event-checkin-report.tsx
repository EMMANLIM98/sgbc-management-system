/**
 * Event Check-In Report Component
 *
 * Displays list of attendees who have checked in to an event.
 */

import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { getEventRegistrations } from "@/modules/events/events.functions";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { CheckCircle2, Search, Loader2 } from "lucide-react";

interface EventCheckinReportProps {
  eventId: string;
}

export function EventCheckinReport({ eventId }: EventCheckinReportProps) {
  const [page, setPage] = useState(1);
  const [searchTerm, setSearchTerm] = useState("");
  const pageSize = 25;

  const getRegistrationsFn = useServerFn(getEventRegistrations);

  const { data, isLoading, error } = useQuery({
    queryKey: ["eventRegistrations", eventId, page, "checked_in"],
    queryFn: () =>
      getRegistrationsFn({
        data: {
          eventId,
          status: "checked_in",
          page,
          pageSize,
        },
      }),
  });

  // Filter registrations by search term
  const filteredRegistrations = useMemo(() => {
    if (!data?.registrations) return [];

    return data.registrations.filter(
      (reg) =>
        reg.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        reg.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        reg.phone?.includes(searchTerm),
    );
  }, [data?.registrations, searchTerm]);

  const totalPages = data ? Math.ceil(data.total / pageSize) : 0;
  const checkedInCount = data?.total || 0;

  if (error) {
    return (
      <Card className="p-6 border border-gray-200 bg-white">
        <p className="text-gray-900 font-medium mb-1">Failed to load check-in report</p>
        <p className="text-sm text-gray-600">
          {error instanceof Error ? error.message : "Please try again."}
        </p>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Summary Card */}
      <Card className="border border-gray-200 bg-white shadow-sm p-6">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-gray-100 rounded-lg">
            <CheckCircle2 className="w-5 h-5 text-gray-700" />
          </div>
          <div>
            <p className="text-sm font-medium text-gray-600">Checked In</p>
            <p className="text-3xl font-bold text-gray-900">{checkedInCount}</p>
          </div>
        </div>
      </Card>

      {/* Search */}
      <div className="relative">
        <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
        <Input
          placeholder="Search by name, email, or phone..."
          value={searchTerm}
          onChange={(e) => {
            setSearchTerm(e.target.value);
            setPage(1);
          }}
          className="pl-10 border-gray-200 bg-white text-gray-900 placeholder:text-gray-500"
        />
      </div>

      {/* Table Card */}
      <Card className="border border-gray-200 bg-white shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="bg-gray-50 border-b border-gray-200">
                <TableHead className="font-semibold text-gray-900">Name</TableHead>
                <TableHead className="font-semibold text-gray-900">Church</TableHead>
                <TableHead className="font-semibold text-gray-900">Email</TableHead>
                <TableHead className="font-semibold text-gray-900">Phone</TableHead>
                <TableHead className="font-semibold text-gray-900">Category</TableHead>
                <TableHead className="font-semibold text-gray-900">Type</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={6} className="h-32 text-center">
                    <Loader2 className="w-5 h-5 animate-spin mx-auto text-gray-400 mb-2" />
                    <p className="text-gray-500 text-sm">Loading attendees...</p>
                  </TableCell>
                </TableRow>
              ) : filteredRegistrations.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="h-24 text-center">
                    <p className="text-gray-500 text-sm">
                      {searchTerm ? "No attendees match your search." : "No checked-in attendees."}
                    </p>
                  </TableCell>
                </TableRow>
              ) : (
                filteredRegistrations.map((registration) => (
                  <TableRow key={registration.id} className="border-b border-gray-100 hover:bg-gray-50 transition-colors">
                    <TableCell className="font-medium text-gray-900">{registration.name}</TableCell>
                    <TableCell className="text-sm text-gray-700">{registration.churchName}</TableCell>
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
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </Card>
    </div>
  );
}
