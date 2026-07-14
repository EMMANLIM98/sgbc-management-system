/**
 * Event Registration Form Component
 *
 * Allows members or guests to register for events.
 * Collects demographic information for analytics.
 */

import { useServerFn } from "@tanstack/react-start";
import { useMutation } from "@tanstack/react-query";
import { useForm, Controller } from "react-hook-form";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card } from "@/components/ui/card";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import { registerForEvent, validateQRCode } from "@/modules/events/events.functions";

const registrationSchema = z.object({
  eventId: z.string().uuid(),
  churchId: z.string().uuid(),
  organizationId: z.string().uuid(),
  memberId: z.string().uuid().nullable().optional(),
  attendeeFirstName: z.string().min(1, "First name is required").max(80),
  attendeeLastName: z.string().min(1, "Last name is required").max(80),
  attendeeEmail: z.string().email("Invalid email").nullable().optional(),
  attendeePhone: z.string().max(40).nullable().optional(),
  ageCategory: z
    .enum(["children", "youth", "young_adults", "adults", "seniors"])
    .nullable()
    .optional(),
  sex: z.enum(["male", "female"]).nullable().optional(),
  visitorStatus: z.enum(["member", "visitor", "first_time_guest"]).nullable().optional(),
  leadershipRole: z
    .enum([
      "pastor",
      "pastor_wife",
      "pastor_children",
      "associate_pastor",
      "elder",
      "deacon",
      "deaconess",
      "preacher",
      "evangelist",
      "ministry_leader",
      "none",
    ])
    .nullable()
    .optional(),
});

type RegistrationInput = z.infer<typeof registrationSchema>;

export interface EventRegistrationFormProps {
  eventId: string;
  churchId: string;
  organizationId: string;
  eventName: string;
  memberId?: string;
  memberName?: string;
  memberEmail?: string;
  onRegistered?: (registrationId: string) => void;
}

export function EventRegistrationForm({
  eventId,
  churchId,
  organizationId,
  eventName,
  memberId,
  memberName,
  memberEmail,
  onRegistered,
}: EventRegistrationFormProps) {
  const registerFn = useServerFn(registerForEvent);

  const {
    register,
    handleSubmit,
    control,
    formState: { errors, isSubmitting },
    reset,
  } = useForm<RegistrationInput>({
    defaultValues: {
      eventId,
      churchId,
      organizationId,
      memberId: memberId || undefined,
      attendeeFirstName: memberName?.split(" ")[0] ?? "",
      attendeeLastName: memberName?.split(" ").slice(1).join(" ") ?? "",
      attendeeEmail: memberEmail ?? "",
      ageCategory: undefined,
      sex: undefined,
      visitorStatus: memberId ? "member" : "visitor",
      leadershipRole: "none",
    },
  });

  const submit = useMutation({
    mutationFn: async (values: RegistrationInput) => {
      const result = await registerFn({
        data: values,
      });
      return result;
    },
    onSuccess: (result: any) => {
      toast.success(`Successfully registered for ${eventName}!`);
      onRegistered?.(result.id);
      reset();
    },
    onError: (error: any) => {
      toast.error(error.message || "Registration failed");
    },
  });

  return (
    <Card className="p-6 max-w-2xl">
      <form onSubmit={handleSubmit((data) => submit.mutate(data))} className="space-y-6">
        <div>
          <h3 className="text-lg font-semibold mb-4">Register for Event</h3>
          <p className="text-sm text-gray-600 mb-4">{eventName}</p>
        </div>

        {/* Name Fields */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label htmlFor="firstName">First Name *</Label>
            <Input
              id="firstName"
              placeholder="First name"
              {...register("attendeeFirstName")}
              disabled={isSubmitting || submit.isPending}
            />
            {errors.attendeeFirstName && (
              <p className="text-xs text-red-600 mt-1">{errors.attendeeFirstName.message}</p>
            )}
          </div>
          <div>
            <Label htmlFor="lastName">Last Name *</Label>
            <Input
              id="lastName"
              placeholder="Last name"
              {...register("attendeeLastName")}
              disabled={isSubmitting || submit.isPending}
            />
            {errors.attendeeLastName && (
              <p className="text-xs text-red-600 mt-1">{errors.attendeeLastName.message}</p>
            )}
          </div>
        </div>

        {/* Contact Fields */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              placeholder="email@example.com"
              {...register("attendeeEmail")}
              disabled={isSubmitting || submit.isPending}
            />
          </div>
          <div>
            <Label htmlFor="phone">Phone</Label>
            <Input
              id="phone"
              placeholder="+1 (555) 000-0000"
              {...register("attendeePhone")}
              disabled={isSubmitting || submit.isPending}
            />
          </div>
        </div>

        {/* Demographics */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label htmlFor="ageCategory">Age Category</Label>
            <Controller
              name="ageCategory"
              control={control}
              render={({ field }) => (
                <Select value={field.value || ""} onValueChange={field.onChange}>
                  <SelectTrigger id="ageCategory">
                    <SelectValue placeholder="Select age group" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">Not specified</SelectItem>
                    <SelectItem value="children">Children (0-12)</SelectItem>
                    <SelectItem value="youth">Youth (13-17)</SelectItem>
                    <SelectItem value="young_adults">Young Adults (18-30)</SelectItem>
                    <SelectItem value="adults">Adults (31-65)</SelectItem>
                    <SelectItem value="seniors">Seniors (65+)</SelectItem>
                  </SelectContent>
                </Select>
              )}
            />
          </div>

          <div>
            <Label htmlFor="sex">Gender</Label>
            <Controller
              name="sex"
              control={control}
              render={({ field }) => (
                <Select value={field.value || ""} onValueChange={field.onChange}>
                  <SelectTrigger id="sex">
                    <SelectValue placeholder="Select gender" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">Not specified</SelectItem>
                    <SelectItem value="male">Male</SelectItem>
                    <SelectItem value="female">Female</SelectItem>
                  </SelectContent>
                </Select>
              )}
            />
          </div>
        </div>

        {/* Membership Status */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label htmlFor="visitorStatus">Membership Status</Label>
            <Controller
              name="visitorStatus"
              control={control}
              render={({ field }) => (
                <Select value={field.value || "visitor"} onValueChange={field.onChange}>
                  <SelectTrigger id="visitorStatus">
                    <SelectValue placeholder="Select status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="member">Member</SelectItem>
                    <SelectItem value="visitor">Visitor</SelectItem>
                    <SelectItem value="first_time_guest">First Time Guest</SelectItem>
                  </SelectContent>
                </Select>
              )}
            />
          </div>

          <div>
            <Label htmlFor="leadershipRole">Leadership Role</Label>
            <Controller
              name="leadershipRole"
              control={control}
              render={({ field }) => (
                <Select value={field.value || "none"} onValueChange={field.onChange}>
                  <SelectTrigger id="leadershipRole">
                    <SelectValue placeholder="Select role" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">None</SelectItem>
                    <SelectItem value="pastor">Pastor</SelectItem>
                    <SelectItem value="pastor_wife">Pastor's Wife</SelectItem>
                    <SelectItem value="associate_pastor">Associate Pastor</SelectItem>
                    <SelectItem value="elder">Elder</SelectItem>
                    <SelectItem value="deacon">Deacon</SelectItem>
                    <SelectItem value="deaconess">Deaconess</SelectItem>
                    <SelectItem value="ministry_leader">Ministry Leader</SelectItem>
                  </SelectContent>
                </Select>
              )}
            />
          </div>
        </div>

        {/* Submit Button */}
        <div className="flex gap-2">
          <Button type="submit" disabled={isSubmitting || submit.isPending} className="flex-1">
            {isSubmitting || submit.isPending ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Registering...
              </>
            ) : (
              "Register for Event"
            )}
          </Button>
        </div>

        {submit.isError && (
          <p className="text-sm text-red-600">{submit.error?.message || "Registration failed"}</p>
        )}
      </form>
    </Card>
  );
}
