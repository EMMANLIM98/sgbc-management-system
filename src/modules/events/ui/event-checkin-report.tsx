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
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";
import { Badge } from "@/components/ui/badge";
import { CheckCircle2, Clock, Search, Download, Loader2 } from "lucide-react";

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
      <Card className="p-6 bg-red-50 border-red-200">
        <p className="text-red-800 font-medium mb-1">Failed to load check-in report</p>
        <p className="text-sm text-red-700">
          {error instanceof Error ? error.message : "Please try again."}
        </p>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Summary Card */}
      <Card className="p-6 bg-gradient-to-r from-green-50 to-emerald-50 border-green-200">
        <div className="flex items-center gap-4">
          <div className="p-3 bg-green-100 rounded-lg">
            <CheckCircle2 className="w-8 h-8 text-green-600" />
          </div>
          <div>
            <p className="text-sm text-green-600 font-medium">Total Checked In</p>
            <p className="text-3xl font-bold text-green-900">{checkedInCount}</p>
            <p className="text-xs text-green-700 mt-1">attendees have checked in</p>
          </div>
        </div>
      </Card>

      {/* Search and Filter */}
      <div className="flex items-center gap-2">
        <div className="flex-1 relative">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <Input
            placeholder="Search by name, email, or phone..."
            value={searchTerm}
            onChange={(e) => {
              setSearchTerm(e.target.value);
              setPage(1);
            }}
            className="pl-10"
          />
        </div>
        <Button variant="outline" size="sm" disabled={!data?.registrations?.length}>
          <Download className="w-4 h-4 mr-2" />
          Export
        </Button>
      </div>

      {/* Table */}
      <Card className="overflow-hidden">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="bg-gray-50">
                <TableHead className="font-semibold">Name</TableHead>
                <TableHead className="font-semibold">Email</TableHead>
                <TableHead className="font-semibold">Phone</TableHead>
                <TableHead className="font-semibold">Category</TableHead>
                <TableHead className="font-semibold">Visitor Status</TableHead>
                <TableHead className="font-semibold text-center">Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={6} className="h-32 text-center">
                    <Loader2 className="w-5 h-5 animate-spin mx-auto text-gray-400 mb-2" />
                    <p className="text-gray-500 text-sm">Loading check-ins...</p>
                  </TableCell>
                </TableRow>
              ) : filteredRegistrations.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="h-24 text-center">
                    <p className="text-gray-500">
                      {searchTerm ? "No check-ins match your search." : "No check-ins yet."}
                    </p>
                  </TableCell>
                </TableRow>
              ) : (
                filteredRegistrations.map((registration) => (
                  <TableRow key={registration.id} className="hover:bg-gray-50">
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
                    <TableCell className="text-center">
                      <Badge className="bg-green-100 text-green-800 hover:bg-green-100 flex items-center gap-1 justify-center">
                        <CheckCircle2 className="w-3 h-3" />
                        Checked In
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>

        {/* Pagination */}
        {totalPages > 1 && !searchTerm && (
          <div className="border-t bg-gray-50 p-4">
            <Pagination>
              <PaginationContent>
                <PaginationItem>
                  <PaginationPrevious
                    onClick={() => setPage(Math.max(1, page - 1))}
                    className={page === 1 ? "pointer-events-none opacity-50" : ""}
                  />
                </PaginationItem>

                {page > 2 && (
                  <>
                    <PaginationItem>
                      <PaginationLink onClick={() => setPage(1)}>1</PaginationLink>
                    </PaginationItem>
                    {page > 3 && (
                      <PaginationItem>
                        <PaginationEllipsis />
                      </PaginationItem>
                    )}
                  </>
                )}

                {page > 1 && (
                  <PaginationItem>
                    <PaginationLink onClick={() => setPage(page - 1)}>{page - 1}</PaginationLink>
                  </PaginationItem>
                )}

                <PaginationItem>
                  <PaginationLink isActive>{page}</PaginationLink>
                </PaginationItem>

                {page < totalPages && (
                  <PaginationItem>
                    <PaginationLink onClick={() => setPage(page + 1)}>{page + 1}</PaginationLink>
                  </PaginationItem>
                )}

                {page < totalPages - 1 && (
                  <>
                    {page < totalPages - 2 && (
                      <PaginationItem>
                        <PaginationEllipsis />
                      </PaginationItem>
                    )}
                    <PaginationItem>
                      <PaginationLink onClick={() => setPage(totalPages)}>{totalPages}</PaginationLink>
                    </PaginationItem>
                  </>
                )}

                <PaginationItem>
                  <PaginationNext
                    onClick={() => setPage(Math.min(totalPages, page + 1))}
                    className={page === totalPages ? "pointer-events-none opacity-50" : ""}
                  />
                </PaginationItem>
              </PaginationContent>
            </Pagination>
          </div>
        )}
      </Card>
    </div>
  );
}
