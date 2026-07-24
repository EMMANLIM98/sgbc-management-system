import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { VisitorRegistrationForm } from "@/modules/visitors/ui/visitor-registration-form";
import { Loader2, CheckCircle2 } from "lucide-react";
import { useState } from "react";
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

export const Route = createFileRoute("/visitor-register/$churchId")({
  component: VisitorRegisterPage,
});

// Public function to get church details (no auth required)
const getChurchPublic = createServerFn({ method: "GET" })
  .inputValidator((d: unknown) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { data: church, error } = await context.supabase
      .from("churches")
      .select("id, name, address")
      .eq("id", data.id)
      .maybeSingle();

    if (error || !church) {
      throw new Error("Church not found");
    }

    return church;
  });

function VisitorRegisterPage() {
  const { churchId } = Route.useParams();
  const [successId, setSuccessId] = useState<string | null>(null);

  const getChurchPublicFn = useServerFn(getChurchPublic);

  const {
    data: church,
    isLoading,
    error,
  } = useQuery({
    queryKey: ["church-public", churchId],
    queryFn: () => getChurchPublicFn({ id: churchId }),
  });

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin mx-auto mb-2 text-gray-400" />
          <p className="text-gray-500">Loading...</p>
        </div>
      </div>
    );
  }

  if (error || !church) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white flex items-center justify-center">
        <div className="text-center max-w-md">
          <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <span className="text-2xl">⚠️</span>
          </div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Invalid Church</h1>
          <p className="text-gray-600">The church registration link is invalid or has expired.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white">
      {/* Header */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-3xl mx-auto px-4 py-6 sm:px-6">
          <h1 className="text-3xl font-bold text-gray-900">{church.name}</h1>
          <p className="text-gray-600 mt-1">Welcome to our church community</p>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-3xl mx-auto px-4 py-12 sm:px-6">
        {successId ? (
          <div className="text-center">
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <CheckCircle2 className="w-10 h-10 text-green-600" />
            </div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Thank You for Visiting!</h2>
            <p className="text-gray-600 mb-6">
              Your information has been recorded. We look forward to seeing you again!
            </p>
            <button
              onClick={() => setSuccessId(null)}
              className="inline-flex items-center justify-center rounded-md bg-gray-900 px-6 py-2 text-sm font-medium text-white shadow-sm hover:bg-gray-800 transition-colors"
            >
              Register Another Visitor
            </button>
          </div>
        ) : (
          <VisitorRegistrationForm
            churchId={churchId}
            onSuccess={(id) => {
              setSuccessId(id);
              setTimeout(() => setSuccessId(null), 5000);
            }}
          />
        )}
      </div>

      {/* Footer */}
      <div className="border-t border-gray-200 bg-white mt-12">
        <div className="max-w-3xl mx-auto px-4 py-6 sm:px-6 text-center text-sm text-gray-600">
          <p>Thank you for your interest in {church.name}</p>
        </div>
      </div>
    </div>
  );
}
