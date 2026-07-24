import { useServerFn } from "@tanstack/react-start";
import { useMutation } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";

import { createEvent } from "@/modules/events/events.functions";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

const schema = z.object({
  title: z.string().min(1, "Event title is required").max(200),
  description: z.string().max(2000).optional(),
  eventDate: z.string().min(1, "Event date is required"),
  startTime: z.string().optional(),
  endTime: z.string().optional(),
  location: z.string().max(500).optional(),
  maxCapacity: z.string().optional(),
  allowMultipleCheckins: z.boolean().default(false),
});

type FormValues = z.infer<typeof schema>;

export interface EventCreateFormProps {
  churchId: string;
  organizationId: string;
  onCreated?: (eventId: string) => void;
}

export function EventCreateForm({ churchId, organizationId, onCreated }: EventCreateFormProps) {
  const createEventFn = useServerFn(createEvent);

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      title: "",
      description: "",
      eventDate: "",
      startTime: "",
      endTime: "",
      location: "",
      maxCapacity: "",
      allowMultipleCheckins: false,
    },
  });

  const submit = useMutation({
    mutationFn: async (values: FormValues) => {
      const result = await createEventFn({
        data: {
          churchId,
          organizationId,
          title: values.title,
          description: values.description || null,
          eventDate: values.eventDate,
          startTime: values.startTime || null,
          endTime: values.endTime || null,
          location: values.location || null,
          maxCapacity:
            values.maxCapacity && values.maxCapacity.trim().length > 0
              ? Number(values.maxCapacity)
              : null,
          allowMultipleCheckins: values.allowMultipleCheckins,
        },
      });

      return result;
    },
    onSuccess: (result) => {
      toast.success("Event created successfully");
      onCreated?.(result.id);
      form.reset();
    },
    onError: (error: any) => {
      toast.error(error?.message || "Failed to create event");
    },
  });

  return (
    <Card className="p-6">
      <form onSubmit={form.handleSubmit((values) => submit.mutate(values))} className="space-y-5">
        <div className="space-y-2">
          <Label htmlFor="title">Event title</Label>
          <Input id="title" placeholder="Sunday Worship Service" {...form.register("title")} />
          {form.formState.errors.title && (
            <p className="text-xs text-red-600">{form.formState.errors.title.message}</p>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="description">Description</Label>
          <Textarea
            id="description"
            rows={4}
            placeholder="Add a brief event description"
            {...form.register("description")}
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="space-y-2 sm:col-span-1">
            <Label htmlFor="eventDate">Date</Label>
            <Input id="eventDate" type="date" {...form.register("eventDate")} />
            {form.formState.errors.eventDate && (
              <p className="text-xs text-red-600">{form.formState.errors.eventDate.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="startTime">Start time</Label>
            <Input id="startTime" type="time" {...form.register("startTime")} />
          </div>

          <div className="space-y-2">
            <Label htmlFor="endTime">End time</Label>
            <Input id="endTime" type="time" {...form.register("endTime")} />
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="location">Location</Label>
            <Input id="location" placeholder="Main Sanctuary" {...form.register("location")} />
          </div>

          <div className="space-y-2">
            <Label htmlFor="maxCapacity">Max capacity</Label>
            <Input
              id="maxCapacity"
              type="number"
              min={1}
              placeholder="300"
              {...form.register("maxCapacity")}
            />
          </div>
        </div>

        <label className="flex items-center gap-2 text-sm text-gray-700">
          <input type="checkbox" {...form.register("allowMultipleCheckins")} />
          Allow multiple check-ins per attendee
        </label>

        <Button type="submit" disabled={submit.isPending} className="w-full sm:w-auto">
          {submit.isPending ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Creating event...
            </>
          ) : (
            "Create Event"
          )}
        </Button>
      </form>
    </Card>
  );
}
