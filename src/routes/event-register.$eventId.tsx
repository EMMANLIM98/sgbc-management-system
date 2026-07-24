/**
 * Public Event Registration Page
 *
 * Unauthenticated route — anyone with the event link can register.
 * Accessible at: /event-register/$eventId
 */

import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useForm, Controller } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { QRCodeCanvas } from "@/components/ui/qr-code-canvas";
import { Card } from "@/components/ui/card";
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
import { Loader2, CheckCircle2, Calendar, MapPin, Clock } from "lucide-react";
import { toast } from "sonner";
import { getPublicEvent, publicRegisterForEvent } from "@/modules/events/events.public.functions";

export const Route = createFileRoute("/event-register/$eventId")({
  head: () => ({ meta: [{ title: "Register for Event" }] }),
  component: PublicRegisterPage,
});

const formSchema = z.object({
  attendeeFirstName: z.string().min(1, "First name is required").max(80),
  attendeeLastName: z.string().min(1, "Last name is required").max(80),
  attendeeEmail: z.string().email("Valid email is required").max(200),
  attendeePhone: z.string().max(40).optional(),
  ageCategory: z.enum(["children", "youth", "young_adults", "adults", "seniors"]).optional(),
  sex: z.enum(["male", "female"]).optional(),
  visitorStatus: z.enum(["member", "visitor", "first_time_guest"]).default("first_time_guest"),
});

type FormValues = z.infer<typeof formSchema>;

function PublicRegisterPage() {
  const { eventId } = Route.useParams();
  const getEventFn = useServerFn(getPublicEvent);
  const registerFn = useServerFn(publicRegisterForEvent);

  const {
    data: event,
    isLoading: eventLoading,
    error: eventError,
  } = useQuery({
    queryKey: ["public-event", eventId],
    queryFn: () => getEventFn({ data: { eventId } }),
    retry: 2,
  });

  const {
    register,
    handleSubmit,
    control,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: { visitorStatus: "first_time_guest" },
  });

  const submitMutation = useMutation({
    mutationFn: (values: FormValues) =>
      registerFn({
        data: {
          eventId,
          ...values,
        },
      }),
    onSuccess: () => {
      toast.success("You're registered! Check your email for your QR code.");
    },
    onError: (error: any) => {
      toast.error(error?.message || "Registration failed. Please try again.");
    },
  });

  // ── Loading state ──
  if (eventLoading) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin mx-auto text-gray-400 mb-3" />
          <p className="text-gray-600">Loading event…</p>
        </div>
      </div>
    );
  }

  // ── Event not found / error ──
  if (eventError || !event) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center px-4">
        <Card className="p-8 max-w-sm w-full text-center">
          <h1 className="text-lg font-semibold text-gray-900 mb-2">Event not available</h1>
          <p className="text-sm text-gray-600 mb-4">
            This event doesn't exist or is no longer accepting registrations.
          </p>
        </Card>
      </div>
    );
  }

  // ── Success state ──
  if (submitMutation.isSuccess && submitMutation.data) {
    const result = submitMutation.data;

    return (
      <div className="min-h-screen bg-white flex items-center justify-center px-4 py-12">
        <div className="max-w-sm w-full space-y-6">
          <div className="text-center">
            <CheckCircle2 className="w-12 h-12 text-green-500 mx-auto mb-3" />
            <h1 className="text-2xl font-light text-gray-900">You're registered!</h1>
            <p className="text-sm text-gray-600 mt-2">
              Your QR code is shown below and has been sent to your email.
            </p>
          </div>

          <Card className="p-6">
            <QRCodeCanvas
              value={result.qrToken}
              title={event.title}
              subtitle={result.attendeeName}
              size={300}
              showDownload
              showPrint
              downloadFilename={`event-registration-${result.id}.png`}
            />

            <p className="text-xs text-gray-500 mt-4 font-mono break-all text-center">
              {result.id}
            </p>
          </Card>

          <p className="text-xs text-gray-500 text-center">
            ⚠️ Keep this QR code private — it is unique to your registration.
          </p>
        </div>
      </div>
    );
  }

  // ── Registration form ──
  const eventDate = new Date(event.eventDate);

  return (
    <div className="min-h-screen bg-white">
      {/* Event header */}
      <div className="border-b border-gray-200 px-6 py-8">
        <div className="max-w-2xl mx-auto">
          <p className="text-xs uppercase tracking-widest text-gray-500 mb-2">Event Registration</p>
          <h1 className="text-2xl font-light text-gray-900">{event.title}</h1>

          <div className="mt-3 flex flex-wrap gap-4 text-sm text-gray-600">
            <span className="flex items-center gap-1.5">
              <Calendar className="w-4 h-4 text-gray-400" />
              {eventDate.toLocaleDateString("en-US", {
                weekday: "long",
                year: "numeric",
                month: "long",
                day: "numeric",
              })}
            </span>
            {(event.startTime || event.endTime) && (
              <span className="flex items-center gap-1.5">
                <Clock className="w-4 h-4 text-gray-400" />
                {event.startTime}
                {event.endTime && ` – ${event.endTime}`}
              </span>
            )}
            {event.location && (
              <span className="flex items-center gap-1.5">
                <MapPin className="w-4 h-4 text-gray-400" />
                {event.location}
              </span>
            )}
          </div>

          {event.description && (
            <p className="mt-3 text-sm text-gray-600 max-w-prose">{event.description}</p>
          )}

          {event.remaining !== null && (
            <p className="mt-3 text-sm font-medium text-gray-800">
              {event.remaining > 0
                ? `${event.remaining} spot${event.remaining === 1 ? "" : "s"} remaining`
                : "This event is at full capacity"}
            </p>
          )}
        </div>
      </div>

      {/* Form */}
      <div className="px-6 py-10">
        <div className="max-w-2xl mx-auto">
          <h2 className="text-lg font-medium text-gray-900 mb-6">Your information</h2>

          <form
            onSubmit={handleSubmit((values) => submitMutation.mutate(values))}
            className="space-y-5"
          >
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="firstName">First name *</Label>
                <Input id="firstName" {...register("attendeeFirstName")} />
                {errors.attendeeFirstName && (
                  <p className="text-xs text-red-600">{errors.attendeeFirstName.message}</p>
                )}
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="lastName">Last name *</Label>
                <Input id="lastName" {...register("attendeeLastName")} />
                {errors.attendeeLastName && (
                  <p className="text-xs text-red-600">{errors.attendeeLastName.message}</p>
                )}
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="email">Email address *</Label>
                <Input id="email" type="email" {...register("attendeeEmail")} />
                {errors.attendeeEmail && (
                  <p className="text-xs text-red-600">{errors.attendeeEmail.message}</p>
                )}
                <p className="text-xs text-gray-500">Your QR code will be sent here.</p>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="phone">Phone (optional)</Label>
                <Input id="phone" type="tel" {...register("attendeePhone")} />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="space-y-1.5">
                <Label>Age group</Label>
                <Controller
                  name="ageCategory"
                  control={control}
                  render={({ field }) => (
                    <Select value={field.value ?? ""} onValueChange={field.onChange}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="children">Children (0–12)</SelectItem>
                        <SelectItem value="youth">Youth (13–17)</SelectItem>
                        <SelectItem value="young_adults">Young Adults (18–30)</SelectItem>
                        <SelectItem value="adults">Adults (31–65)</SelectItem>
                        <SelectItem value="seniors">Seniors (65+)</SelectItem>
                      </SelectContent>
                    </Select>
                  )}
                />
              </div>

              <div className="space-y-1.5">
                <Label>Gender</Label>
                <Controller
                  name="sex"
                  control={control}
                  render={({ field }) => (
                    <Select value={field.value ?? ""} onValueChange={field.onChange}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="male">Male</SelectItem>
                        <SelectItem value="female">Female</SelectItem>
                      </SelectContent>
                    </Select>
                  )}
                />
              </div>

              <div className="space-y-1.5">
                <Label>Attendance type</Label>
                <Controller
                  name="visitorStatus"
                  control={control}
                  render={({ field }) => (
                    <Select value={field.value} onValueChange={field.onChange}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="member">Member</SelectItem>
                        <SelectItem value="visitor">Visitor</SelectItem>
                        <SelectItem value="first_time_guest">First-time guest</SelectItem>
                      </SelectContent>
                    </Select>
                  )}
                />
              </div>
            </div>

            {submitMutation.isError && (
              <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded px-3 py-2">
                {(submitMutation.error as any)?.message || "Registration failed. Please try again."}
              </p>
            )}

            <Button
              type="submit"
              disabled={submitMutation.isPending}
              className="w-full sm:w-auto bg-gray-900 hover:bg-gray-800 text-white"
            >
              {submitMutation.isPending ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Registering…
                </>
              ) : (
                "Complete Registration"
              )}
            </Button>

            <p className="text-xs text-gray-500">
              A QR code will be sent to your email address for check-in at the event.
            </p>
          </form>
        </div>
      </div>
    </div>
  );
}
