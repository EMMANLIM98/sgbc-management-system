import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { listVisitors } from "@/modules/visitors/visitors.functions";
import { useCurrentChurch } from "@/hooks/use-current-church";
import { VisitorCard } from "@/modules/visitors/ui/visitor-card";
import { VisitorQRCode } from "@/modules/visitors/ui/visitor-qr-code";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { useState } from "react";
import { Search, Loader2 } from "lucide-react";

export const Route = createFileRoute("/_authenticated/visitors/")({
  component: VisitorsPage,
});

function VisitorsPage() {
  const { church } = useCurrentChurch();
  const listVisitorsFn = useServerFn(listVisitors);
  const [searchQuery, setSearchQuery] = useState("");

  const { data: visitors, isLoading } = useQuery({
    queryKey: ["visitors", church?.id, searchQuery],
    queryFn: () =>
      listVisitorsFn({
        church_id: church?.id,
        q: searchQuery,
      }),
    enabled: !!church?.id,
  });

  const visitorList = visitors || [];

  // Group visitors by status for statistics
  const stats = {
    total: visitorList.length,
    first_time: visitorList.filter((v: any) => v.visitor_status === "first_time").length,
    returning: visitorList.filter((v: any) => v.visitor_status === "returning").length,
    needs_followup: visitorList.filter((v: any) => v.visitor_status === "needs_followup").length,
    interested_membership: visitorList.filter((v: any) => v.visitor_status === "interested_membership").length,
    prayer_request: visitorList.filter((v: any) => v.visitor_status === "prayer_request_only").length,
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Visitors</h1>
        <p className="text-gray-600 mt-1">Manage and track church visitors</p>
      </div>

      {/* QR Code Section */}
      {church && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2">
            <VisitorQRCode churchId={church.id} churchName={church.name} />
          </div>

          {/* Statistics */}
          <div className="space-y-3">
            <Card className="border border-gray-200 bg-white shadow-sm p-4">
              <p className="text-sm text-gray-600 mb-1">Total Visitors</p>
              <p className="text-3xl font-bold text-gray-900">{stats.total}</p>
            </Card>

            <Card className="border-2 border-green-200 bg-green-50 shadow-sm p-4">
              <p className="text-sm text-gray-600 mb-1">First-time</p>
              <p className="text-2xl font-bold text-green-700">{stats.first_time}</p>
            </Card>

            <Card className="border-2 border-blue-200 bg-blue-50 shadow-sm p-4">
              <p className="text-sm text-gray-600 mb-1">Returning</p>
              <p className="text-2xl font-bold text-blue-700">{stats.returning}</p>
            </Card>

            <Card className="border-2 border-yellow-200 bg-yellow-50 shadow-sm p-4">
              <p className="text-sm text-gray-600 mb-1">Follow-up Needed</p>
              <p className="text-2xl font-bold text-yellow-700">{stats.needs_followup}</p>
            </Card>

            <Card className="border-2 border-purple-200 bg-purple-50 shadow-sm p-4">
              <p className="text-sm text-gray-600 mb-1">Membership Interest</p>
              <p className="text-2xl font-bold text-purple-700">{stats.interested_membership}</p>
            </Card>
          </div>
        </div>
      )}

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-3 w-4 h-4 text-gray-400" />
        <Input
          placeholder="Search visitors by name, email, or address..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-10 border-gray-200 bg-white text-gray-900 placeholder:text-gray-500"
        />
      </div>

      {/* Visitors List */}
      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
        </div>
      ) : visitorList.length === 0 ? (
        <Card className="border border-gray-200 bg-white shadow-sm p-12 text-center">
          <p className="text-gray-500">No visitors found. Scan the QR code to register new visitors!</p>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {visitorList.map((visitor: any) => (
            <VisitorCard
              key={visitor.id}
              id={visitor.id}
              full_name={visitor.full_name}
              contact_number={visitor.contact_number}
              email_address={visitor.email_address}
              home_address={visitor.home_address}
              visitor_status={visitor.visitor_status}
              is_first_time_visitor={visitor.is_first_time_visitor}
              interests={visitor.interests}
              prayer_requests={visitor.prayer_requests}
              visit_date={visitor.visit_date}
              invited_by={visitor.invited_by}
            />
          ))}
        </div>
      )}
    </div>
  );
}
