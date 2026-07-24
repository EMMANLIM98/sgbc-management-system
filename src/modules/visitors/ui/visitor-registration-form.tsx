import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { createVisitor } from "@/modules/visitors/visitors.functions";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";

interface VisitorFormProps {
  churchId: string;
  onSuccess?: (visitorId: string) => void;
}

const INTERESTS = [
  { id: "bible_study", label: "Bible Study" },
  { id: "small_group", label: "Small Group" },
  { id: "volunteer_ministry", label: "Volunteer Ministry" },
  { id: "baptism", label: "Baptism" },
  { id: "church_membership", label: "Church Membership" },
];

export function VisitorRegistrationForm({ churchId, onSuccess }: VisitorFormProps) {
  const createVisitorFn = useServerFn(createVisitor);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [formData, setFormData] = useState({
    full_name: "",
    contact_number: "",
    email_address: "",
    home_address: "",
    is_first_time_visitor: true,
    invited_by: "",
    prayer_requests: "",
    interests: [] as string[],
  });

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleCheckboxChange = (checked: boolean, fieldName: string) => {
    if (fieldName === "is_first_time_visitor") {
      setFormData((prev) => ({ ...prev, is_first_time_visitor: checked }));
    }
  };

  const handleInterestToggle = (interestId: string) => {
    setFormData((prev) => ({
      ...prev,
      interests: prev.interests.includes(interestId)
        ? prev.interests.filter((i) => i !== interestId)
        : [...prev.interests, interestId],
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.full_name.trim()) {
      toast.error("Please enter your full name");
      return;
    }

    if (!formData.contact_number.trim()) {
      toast.error("Please enter your contact number");
      return;
    }

    try {
      setIsSubmitting(true);

      const result = await createVisitorFn({
        church_id: churchId,
        visit_date: new Date().toISOString().split("T")[0],
        full_name: formData.full_name.trim(),
        contact_number: formData.contact_number.trim(),
        email_address: formData.email_address || null,
        home_address: formData.home_address || null,
        is_first_time_visitor: formData.is_first_time_visitor,
        invited_by: formData.invited_by || null,
        prayer_requests: formData.prayer_requests || null,
        interests: formData.interests,
        visitor_status: formData.is_first_time_visitor ? "first_time" : "returning",
        source: formData.invited_by ? "invited" : "walk_in",
        can_visit: false,
      });

      toast.success("✨ Thank you for visiting! Your information has been recorded.");
      setFormData({
        full_name: "",
        contact_number: "",
        email_address: "",
        home_address: "",
        is_first_time_visitor: true,
        invited_by: "",
        prayer_requests: "",
        interests: [],
      });

      if (onSuccess && result.id) {
        onSuccess(result.id);
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to register visitor";
      toast.error(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Card className="border border-gray-200 bg-white shadow-sm p-6">
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-gray-900">Visitor Information</h2>
        <p className="text-sm text-gray-600 mt-1">
          Welcome! Please fill out your information below.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-5">
        {/* Full Name */}
        <div>
          <Label className="block text-sm font-medium text-gray-900 mb-2">Full Name *</Label>
          <Input
            type="text"
            name="full_name"
            value={formData.full_name}
            onChange={handleInputChange}
            placeholder="Enter your full name"
            disabled={isSubmitting}
            className="border-gray-200 bg-white text-gray-900 placeholder:text-gray-500"
            required
          />
        </div>

        {/* Contact Number */}
        <div>
          <Label className="block text-sm font-medium text-gray-900 mb-2">Contact Number *</Label>
          <Input
            type="tel"
            name="contact_number"
            value={formData.contact_number}
            onChange={handleInputChange}
            placeholder="Enter your contact number"
            disabled={isSubmitting}
            className="border-gray-200 bg-white text-gray-900 placeholder:text-gray-500"
            required
          />
        </div>

        {/* Email Address */}
        <div>
          <Label className="block text-sm font-medium text-gray-900 mb-2">
            Email Address (optional)
          </Label>
          <Input
            type="email"
            name="email_address"
            value={formData.email_address}
            onChange={handleInputChange}
            placeholder="Enter your email"
            disabled={isSubmitting}
            className="border-gray-200 bg-white text-gray-900 placeholder:text-gray-500"
          />
        </div>

        {/* Home Address */}
        <div>
          <Label className="block text-sm font-medium text-gray-900 mb-2">Home Address</Label>
          <Textarea
            name="home_address"
            value={formData.home_address}
            onChange={handleInputChange}
            placeholder="Enter your home address"
            disabled={isSubmitting}
            rows={2}
            className="border-gray-200 bg-white text-gray-900 placeholder:text-gray-500"
          />
        </div>

        {/* First-Time Visitor */}
        <div className="flex items-center gap-3">
          <Checkbox
            id="is_first_time_visitor"
            checked={formData.is_first_time_visitor}
            onCheckedChange={(checked) =>
              handleCheckboxChange(checked as boolean, "is_first_time_visitor")
            }
            disabled={isSubmitting}
            className="border-gray-300"
          />
          <Label
            htmlFor="is_first_time_visitor"
            className="text-sm font-medium text-gray-900 cursor-pointer"
          >
            This is my first time visiting
          </Label>
        </div>

        {/* Invited By */}
        {!formData.is_first_time_visitor && (
          <div>
            <Label className="block text-sm font-medium text-gray-900 mb-2">Who invited you?</Label>
            <Input
              type="text"
              name="invited_by"
              value={formData.invited_by}
              onChange={handleInputChange}
              placeholder="Name of the person who invited you"
              disabled={isSubmitting}
              className="border-gray-200 bg-white text-gray-900 placeholder:text-gray-500"
            />
          </div>
        )}

        {/* Interests */}
        <div>
          <Label className="block text-sm font-medium text-gray-900 mb-3">
            Interested In (optional)
          </Label>
          <div className="space-y-2">
            {INTERESTS.map((interest) => (
              <div key={interest.id} className="flex items-center gap-3">
                <Checkbox
                  id={interest.id}
                  checked={formData.interests.includes(interest.id)}
                  onCheckedChange={() => handleInterestToggle(interest.id)}
                  disabled={isSubmitting}
                  className="border-gray-300"
                />
                <Label htmlFor={interest.id} className="text-sm text-gray-700 cursor-pointer">
                  {interest.label}
                </Label>
              </div>
            ))}
          </div>
        </div>

        {/* Prayer Requests */}
        <div>
          <Label className="block text-sm font-medium text-gray-900 mb-2">
            Prayer Requests (optional)
          </Label>
          <Textarea
            name="prayer_requests"
            value={formData.prayer_requests}
            onChange={handleInputChange}
            placeholder="Share any prayer requests..."
            disabled={isSubmitting}
            rows={3}
            className="border-gray-200 bg-white text-gray-900 placeholder:text-gray-500"
          />
        </div>

        {/* Submit Button */}
        <Button
          type="submit"
          disabled={isSubmitting}
          className="w-full bg-gray-900 text-white hover:bg-gray-800"
        >
          {isSubmitting ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Submitting...
            </>
          ) : (
            "Submit Visitor Information"
          )}
        </Button>
      </form>
    </Card>
  );
}
