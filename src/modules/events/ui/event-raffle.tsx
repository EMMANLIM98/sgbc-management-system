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
  populateRaffleEntries,
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
import { Loader2, Gift, Sparkles, Trash2 } from "lucide-react";
import { toast } from "sonner";

interface EventRaffleProps {
  eventId: string;
}

export function EventRaffle({ eventId }: EventRaffleProps) {
  const [prizeName, setPrizeName] = useState("");
  const [isDrawing, setIsDrawing] = useState(false);
  const [isPopulating, setIsPopulating] = useState(false);

  const drawWinnerFn = useServerFn(drawRaffleWinner);
  const getWinnersFn = useServerFn(getRaffleWinners);
  const populateEntriesFn = useServerFn(populateRaffleEntries);
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
          pageSize: 1000,
        },
      }),
  });

  // Get existing winners
  const { data: winnersData, isLoading: loadingWinners, refetch: refetchWinners } = useQuery({
    queryKey: ["raffleWinners", eventId],
    queryFn: () => getWinnersFn({ data: { eventId } }),
  });

  const handlePopulateRaffle = async () => {
    try {
      setIsPopulating(true);
      const result = await populateEntriesFn({
        data: { eventId },
      });
      toast.success(result.message);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to populate raffle";
      toast.error(message);
    } finally {
      setIsPopulating(false);
    }
  };

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

      if (result.winner) {
        toast.success(
          `🎉 Winner: ${result.winner.participantName} wins ${result.winner.prizeName}!`,
        );
        setPrizeName("");
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
  const winners = winnersData || [];

  return (
    <div className="space-y-6">
      {/* Raffle Summary */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="p-6 bg-gradient-to-br from-blue-50 to-indigo-50 border-indigo-200">
          <div className="flex items-center gap-3 mb-2">
            <Gift className="w-5 h-5 text-indigo-600" />
            <h3 className="font-semibold text-indigo-900">Checked In</h3>
          </div>
          <p className="text-3xl font-bold text-indigo-600">{checkedInCount}</p>
          <p className="text-xs text-indigo-600 mt-2">Eligible raffle entries</p>
        </Card>

        <Card className="p-6 bg-gradient-to-br from-purple-50 to-pink-50 border-purple-200">
          <div className="flex items-center gap-3 mb-2">
            <Sparkles className="w-5 h-5 text-purple-600" />
            <h3 className="font-semibold text-purple-900">Winners</h3>
          </div>
          <p className="text-3xl font-bold text-purple-600">{winners.length}</p>
          <p className="text-xs text-purple-600 mt-2">Prizes drawn</p>
        </Card>

        <Card className="p-6 bg-gradient-to-br from-green-50 to-emerald-50 border-green-200">
          <div className="flex items-center gap-3 mb-2">
            <Gift className="w-5 h-5 text-green-600" />
            <h3 className="font-semibold text-green-900">Remaining</h3>
          </div>
          <p className="text-3xl font-bold text-green-600">
            {Math.max(0, checkedInCount - winners.length)}
          </p>
          <p className="text-xs text-green-600 mt-2">Eligible entries left</p>
        </Card>
      </div>

      {/* Draw Controls */}
      <Card className="p-6 border-2 border-dashed border-purple-300 bg-purple-50">
        <div className="flex flex-col gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Prize Name</label>
            <Input
              placeholder="e.g., Gift Card, Coffee Maker, Books..."
              value={prizeName}
              onChange={(e) => setPrizeName(e.target.value)}
              disabled={isDrawing || checkedInCount === 0}
              className="w-full"
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
              <>
                <Button
                  onClick={handlePopulateRaffle}
                  disabled={isPopulating || winners.length > 0}
                  variant="outline"
                  className="flex-1"
                >
                  <Gift className="w-4 h-4 mr-2" />
                  {isPopulating ? "Populating..." : "Populate Raffle"}
                </Button>

                <Button
                  onClick={handleDrawWinner}
                  disabled={
                    isDrawing || checkedInCount === 0 || !prizeName.trim() || winners.length >= checkedInCount
                  }
                  className="flex-1 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700"
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
              </>
            )}
          </div>

          {winners.length >= checkedInCount && checkedInCount > 0 && (
            <div className="p-3 bg-yellow-100 border border-yellow-300 rounded-md">
              <p className="text-sm text-yellow-800">
                ✨ All checked-in attendees have won! {checkedInCount} winners from {checkedInCount}{" "}
                entries.
              </p>
            </div>
          )}
        </div>
      </Card>

      {/* Winners List */}
      {winners.length > 0 && (
        <Card className="overflow-hidden">
          <div className="p-6 border-b bg-gradient-to-r from-purple-50 to-pink-50">
            <h3 className="font-semibold text-lg flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-purple-600" />
              Raffle Winners ({winners.length})
            </h3>
          </div>

          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="font-semibold">#</TableHead>
                  <TableHead className="font-semibold">Winner</TableHead>
                  <TableHead className="font-semibold">Email</TableHead>
                  <TableHead className="font-semibold">Prize</TableHead>
                  <TableHead className="font-semibold">Drawn At</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {winners.map((winner, idx) => (
                  <TableRow key={winner.id} className="hover:bg-gray-50">
                    <TableCell>
                      <Badge className="bg-gradient-to-r from-purple-600 to-pink-600">
                        {idx + 1}
                      </Badge>
                    </TableCell>
                    <TableCell className="font-medium">{winner.participantName}</TableCell>
                    <TableCell className="text-sm text-gray-600">{winner.participantEmail || "-"}</TableCell>
                    <TableCell className="font-medium">
                      <Badge variant="outline" className="bg-yellow-50 text-yellow-800 border-yellow-300">
                        {winner.prizeName}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-sm text-gray-500">
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
        <Card className="p-12 text-center">
          <Loader2 className="w-8 h-8 animate-spin mx-auto mb-2 text-gray-400" />
          <p className="text-gray-500">Loading raffle data...</p>
        </Card>
      )}
    </div>
  );
}
