/**
 * Event Raffle Component
 *
 * Allows drawing random raffle winners from checked-in attendees.
 * Integrates with the RaffleService for winner selection.
 */

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import {
  drawRaffleWinner,
  getRaffleWinners,
  getEventRegistrations,
} from "@/modules/events/events.functions";
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
import { Badge } from "@/components/ui/badge";
import { Loader2, Gift, Sparkles, Trophy } from "lucide-react";
import { toast } from "sonner";

interface EventRaffleProps {
  eventId: string;
}

export function EventRaffle({ eventId }: EventRaffleProps) {
  const [prizeName, setPrizeName] = useState("");
  const [isDrawing, setIsDrawing] = useState(false);

  const drawWinnerFn = useServerFn(drawRaffleWinner);
  const getWinnersFn = useServerFn(getRaffleWinners);
  const getRegistrationsFn = useServerFn(getEventRegistrations);

  // Get checked-in attendees
  const { data: checkedInData, isLoading: loadingCheckedIn } = useQuery({
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
  });

  // Get existing winners
  const { data: winnersData, isLoading: loadingWinners, refetch: refetchWinners } = useQuery({
    queryKey: ["raffleWinners", eventId],
    queryFn: () => getWinnersFn({ data: { eventId } }),
  });

  const handleDrawWinner = async () => {
    if (!prizeName.trim()) {
      toast.error("Please enter a prize name");
      return;
    }

    try {
      setIsDrawing(true);
      const result = await drawWinnerFn({
        data: {
          eventId,
          prizeName: prizeName.trim(),
        },
      });

      if (result.participantName) {
        toast.success(
          `🎉 Winner: ${result.participantName} wins ${result.prizeName}!`,
        );
        setPrizeName("");
        // Refetch winners to update the UI
        await refetchWinners();
      } else {
        toast.error("No eligible entries for raffle");
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to draw winner";
      toast.error(message);
    } finally {
      setIsDrawing(false);
    }
  };

  const checkedInCount = checkedInData?.total || 0;
  const winners = winnersData?.winners || [];

  return (
    <div className="space-y-6">
      {/* Raffle Summary */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="p-6 border border-gray-200 bg-white shadow-sm">
          <div className="flex items-center gap-3 mb-2">
            <Gift className="w-5 h-5 text-gray-600" />
            <h3 className="font-semibold text-gray-900">Eligible Entries</h3>
          </div>
          <p className="text-3xl font-bold text-gray-900">{checkedInCount}</p>
          <p className="text-xs text-gray-500 mt-2">Checked in attendees</p>
        </Card>

        <Card className="p-6 border border-gray-200 bg-white shadow-sm">
          <div className="flex items-center gap-3 mb-2">
            <Sparkles className="w-5 h-5 text-gray-600" />
            <h3 className="font-semibold text-gray-900">Winners</h3>
          </div>
          <p className="text-3xl font-bold text-gray-900">{winners.length}</p>
          <p className="text-xs text-gray-500 mt-2">Prizes drawn</p>
        </Card>

        <Card className="p-6 border border-gray-200 bg-white shadow-sm">
          <div className="flex items-center gap-3 mb-2">
            <Gift className="w-5 h-5 text-gray-600" />
            <h3 className="font-semibold text-gray-900">Remaining</h3>
          </div>
          <p className="text-3xl font-bold text-gray-900">
            {Math.max(0, checkedInCount - winners.length)}
          </p>
          <p className="text-xs text-gray-500 mt-2">Eligible entries left</p>
        </Card>
      </div>

      {/* Draw Controls */}
      <Card className="p-6 border border-gray-200 bg-gray-50 shadow-sm">
        <div className="flex flex-col gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-900 mb-2">Prize Name</label>
            <Input
              placeholder="e.g., Gift Card, Coffee Maker, Books..."
              value={prizeName}
              onChange={(e) => setPrizeName(e.target.value)}
              disabled={isDrawing || loadingCheckedIn || checkedInCount === 0}
              className="border-gray-200 bg-white text-gray-900 placeholder:text-gray-500"
            />
          </div>

          <div className="flex gap-3">
            {checkedInCount === 0 ? (
              <div className="w-full">
                <Button variant="outline" className="w-full" disabled>
                  No checked-in attendees
                </Button>
              </div>
            ) : (
              <Button
                onClick={handleDrawWinner}
                disabled={
                  isDrawing || checkedInCount === 0 || !prizeName.trim() || winners.length >= checkedInCount
                }
                className="w-full bg-gray-900 text-white hover:bg-gray-800"
              >
                {isDrawing ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Drawing...
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4 mr-2" />
                    Draw Winner 🎉
                  </>
                )}
              </Button>
            )}
          </div>

          {winners.length >= checkedInCount && checkedInCount > 0 && (
            <div className="p-3 bg-gray-100 border border-gray-200 rounded-md">
              <p className="text-sm text-gray-700">
                ✨ All checked-in attendees have won! {checkedInCount} winners from {checkedInCount} entries.
              </p>
            </div>
          )}
        </div>
      </Card>

      {/* Eligible Attendees List */}
      {checkedInData && checkedInData.data && checkedInData.data.length > 0 && (
        <Card className="border border-gray-200 bg-white shadow-sm overflow-hidden">
          <div className="p-6 border-b border-gray-200 bg-gray-50">
            <h3 className="font-semibold text-lg flex items-center gap-2 text-gray-900">
              <Gift className="w-5 h-5 text-gray-600" />
              Eligible Attendees ({checkedInData.data.length})
            </h3>
          </div>

          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-gray-50 border-b border-gray-200">
                  <TableHead className="font-semibold text-gray-900">Attendee</TableHead>
                  <TableHead className="font-semibold text-gray-900">Email</TableHead>
                  <TableHead className="font-semibold text-gray-900">Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {checkedInData.data.map((attendee: any) => {
                  const hasWon = winners.some(
                    (w: any) => w.participantEmail === attendee.participantEmail,
                  );
                  return (
                    <TableRow
                      key={attendee.id}
                      className={`border-b border-gray-100 transition-colors ${
                        hasWon ? "bg-green-50 hover:bg-green-100" : "hover:bg-gray-50"
                      }`}
                    >
                      <TableCell className="font-medium text-gray-900">
                        {attendee.participantName}
                      </TableCell>
                      <TableCell className="text-sm text-gray-600">
                        {attendee.participantEmail || "—"}
                      </TableCell>
                      <TableCell>
                        {hasWon ? (
                          <Badge className="bg-green-100 text-green-700 border-green-200 flex items-center gap-1 w-fit">
                            <Trophy className="w-3 h-3" />
                            Winner
                          </Badge>
                        ) : (
                          <Badge
                            variant="outline"
                            className="bg-gray-100 text-gray-700 border-gray-200"
                          >
                            Eligible
                          </Badge>
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        </Card>
      )}

      {/* Winners List */}
      {winners.length > 0 && (
        <Card className="border border-gray-200 bg-white shadow-sm overflow-hidden">
          <div className="p-6 border-b border-gray-200 bg-gray-50">
            <h3 className="font-semibold text-lg flex items-center gap-2 text-gray-900">
              <Sparkles className="w-5 h-5 text-gray-600" />
              Raffle Winners ({winners.length})
            </h3>
          </div>

          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-gray-50 border-b border-gray-200">
                  <TableHead className="font-semibold text-gray-900">#</TableHead>
                  <TableHead className="font-semibold text-gray-900">Winner</TableHead>
                  <TableHead className="font-semibold text-gray-900">Email</TableHead>
                  <TableHead className="font-semibold text-gray-900">Prize</TableHead>
                  <TableHead className="font-semibold text-gray-900">Drawn At</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {winners.map((winner, idx) => (
                  <TableRow key={winner.id} className="border-b border-gray-100 hover:bg-gray-50 transition-colors">
                    <TableCell>
                      <Badge variant="outline" className="bg-gray-100 text-gray-700 border-gray-200 font-semibold">
                        {idx + 1}
                      </Badge>
                    </TableCell>
                    <TableCell className="font-medium text-gray-900">{winner.participantName}</TableCell>
                    <TableCell className="text-sm text-gray-600">{winner.participantEmail || "—"}</TableCell>
                    <TableCell className="font-medium">
                      <Badge variant="outline" className="bg-gray-100 text-gray-700 border-gray-200">
                        {winner.prizeName}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-sm text-gray-600">
                      {new Date(winner.drawnAt).toLocaleDateString()} at{" "}
                      {new Date(winner.drawnAt).toLocaleTimeString()}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </Card>
      )}

      {loadingWinners && (
        <Card className="p-12 text-center border border-gray-200 bg-white shadow-sm">
          <Loader2 className="w-8 h-8 animate-spin mx-auto mb-2 text-gray-400" />
          <p className="text-gray-500">Loading raffle data...</p>
        </Card>
      )}
    </div>
  );
}
