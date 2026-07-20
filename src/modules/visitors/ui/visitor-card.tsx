import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Mail, Phone, MapPin, User } from "lucide-react";

interface VisitorCardProps {
  id: string;
  full_name: string;
  contact_number: string;
  email_address?: string;
  home_address?: string;
  visitor_status: "first_time" | "returning" | "needs_followup" | "interested_membership" | "prayer_request_only";
  is_first_time_visitor?: boolean;
  interests?: string[];
  prayer_requests?: string;
  visit_date?: string;
  invited_by?: string;
  onClick?: () => void;
}

const STATUS_CONFIG = {
  first_time: {
    label: "First-time Visitor",
    bgColor: "bg-green-50",
    borderColor: "border-green-200",
    badgeClass: "bg-green-100 text-green-700 border-green-200",
  },
  returning: {
    label: "Returning Visitor",
    bgColor: "bg-blue-50",
    borderColor: "border-blue-200",
    badgeClass: "bg-blue-100 text-blue-700 border-blue-200",
  },
  needs_followup: {
    label: "Needs Follow-up",
    bgColor: "bg-yellow-50",
    borderColor: "border-yellow-200",
    badgeClass: "bg-yellow-100 text-yellow-700 border-yellow-200",
  },
  interested_membership: {
    label: "Interested in Membership",
    bgColor: "bg-purple-50",
    borderColor: "border-purple-200",
    badgeClass: "bg-purple-100 text-purple-700 border-purple-200",
  },
  prayer_request_only: {
    label: "Prayer Request Only",
    bgColor: "bg-red-50",
    borderColor: "border-red-200",
    badgeClass: "bg-red-100 text-red-700 border-red-200",
  },
};

const INTERESTS_LABELS: Record<string, string> = {
  bible_study: "Bible Study",
  small_group: "Small Group",
  volunteer_ministry: "Volunteer Ministry",
  baptism: "Baptism",
  church_membership: "Church Membership",
};

export function VisitorCard({
  id,
  full_name,
  contact_number,
  email_address,
  home_address,
  visitor_status,
  is_first_time_visitor,
  interests = [],
  prayer_requests,
  visit_date,
  invited_by,
  onClick,
}: VisitorCardProps) {
  const config = STATUS_CONFIG[visitor_status];

  return (
    <Card
      className={`border-2 ${config.borderColor} ${config.bgColor} shadow-sm p-5 cursor-pointer transition-all hover:shadow-md`}
      onClick={onClick}
    >
      {/* Header with Name and Status */}
      <div className="flex items-start justify-between gap-3 mb-4">
        <div className="flex-1">
          <h3 className="text-lg font-semibold text-gray-900">{full_name}</h3>
          {visit_date && <p className="text-xs text-gray-500">{new Date(visit_date).toLocaleDateString()}</p>}
        </div>
        <Badge variant="outline" className={`whitespace-nowrap ${config.badgeClass}`}>
          {config.label}
        </Badge>
      </div>

      {/* Contact Information */}
      <div className="space-y-2 mb-4">
        <div className="flex items-center gap-2">
          <Phone className="w-4 h-4 text-gray-500" />
          <span className="text-sm text-gray-700">{contact_number}</span>
        </div>
        {email_address && (
          <div className="flex items-center gap-2">
            <Mail className="w-4 h-4 text-gray-500" />
            <span className="text-sm text-gray-700 truncate">{email_address}</span>
          </div>
        )}
        {home_address && (
          <div className="flex items-start gap-2">
            <MapPin className="w-4 h-4 text-gray-500 flex-shrink-0 mt-0.5" />
            <span className="text-sm text-gray-700">{home_address}</span>
          </div>
        )}
      </div>

      {/* Invited By */}
      {invited_by && (
        <div className="mb-3 p-2 bg-white/50 border border-gray-200 rounded text-sm">
          <div className="flex items-center gap-2">
            <User className="w-4 h-4 text-gray-500" />
            <span className="text-gray-700">Invited by: {invited_by}</span>
          </div>
        </div>
      )}

      {/* Interests */}
      {interests.length > 0 && (
        <div className="mb-3">
          <p className="text-xs font-medium text-gray-700 mb-2">Interested In:</p>
          <div className="flex flex-wrap gap-1">
            {interests.map((interest) => (
              <Badge key={interest} variant="outline" className="bg-white border-gray-200 text-gray-700 text-xs">
                {INTERESTS_LABELS[interest] || interest}
              </Badge>
            ))}
          </div>
        </div>
      )}

      {/* Prayer Requests */}
      {prayer_requests && (
        <div className="p-2 bg-white/50 border border-gray-200 rounded text-sm">
          <p className="text-xs font-medium text-gray-700 mb-1">Prayer Requests:</p>
          <p className="text-gray-700 line-clamp-2">{prayer_requests}</p>
        </div>
      )}
    </Card>
  );
}
